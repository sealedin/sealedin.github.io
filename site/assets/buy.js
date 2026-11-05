// Buying a key with a Solana Pay transfer request: no wallet connection, the browser only shows a QR and watches claim.
// The treasury address comes only from the catalog reply. The code and the key never reach a URL, a log or the console.
(() => {
  const API = 'https://api.sealedin.ai';
  const TAG = 'sealedin-pay-reference-v1';
  const STORE = 'sealedin.pending-payment';
  const DEFAULT_WAIT = 5;
  const TROUBLE_WAIT = 15;
  const SLOW_AFTER_MS = 600000;

  const start = document.getElementById('buy-start');
  const panel = document.getElementById('buy-flow');
  const buy = document.getElementById('buy-key');
  if (!start || !panel || !buy) return;

  // Held in memory only, for a top-up, and sent only to claim.
  let bearer = null;
  let session = null;
  let qrLibrary = null;

  // Base58

  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  function base58encode(bytes) {
    const digits = [];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        carry += digits[i] << 8;
        digits[i] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    let out = '';
    for (const byte of bytes) {
      if (byte) break;
      out += '1';
    }
    for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
    return out;
  }

  function base58decode(text) {
    const bytes = [];
    for (const char of text) {
      let carry = ALPHABET.indexOf(char);
      if (carry < 0) return null;
      for (let i = 0; i < bytes.length; i++) {
        carry += bytes[i] * 58;
        bytes[i] = carry & 255;
        carry >>= 8;
      }
      while (carry) {
        bytes.push(carry & 255);
        carry >>= 8;
      }
    }
    for (const char of text) {
      if (char !== '1') break;
      bytes.push(0);
    }
    return Uint8Array.from(bytes.reverse());
  }

  const isKey32 = (text) => typeof text === 'string' && text.length <= 44 && base58decode(text)?.length === 32;

  // Code and reference

  function newCode() {
    return base58encode(crypto.getRandomValues(new Uint8Array(32)));
  }

  async function referenceOf(code) {
    const tag = new TextEncoder().encode(TAG);
    const raw = base58decode(code);
    const input = new Uint8Array(tag.length + 1 + raw.length);
    input.set(tag, 0);
    input.set(raw, tag.length + 1);
    return base58encode(new Uint8Array(await crypto.subtle.digest('SHA-256', input)));
  }

  function canonicalAmount(text) {
    const value = text.trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
    const amount = Number(value);
    return amount >= 20 && amount <= 100 ? String(amount) : null;
  }

  function payUrl(catalog, amount, reference, topup) {
    const message = encodeURIComponent(topup ? 'SealedIn top-up' : 'SealedIn key');
    return `solana:${catalog.pay_to}?amount=${amount}&spl-token=${catalog.asset}&reference=${reference}&label=SealedIn&message=${message}`;
  }

  // Storage: a failure only means a reload cannot resume, and the page says so.

  function save(pending) {
    try {
      localStorage.setItem(STORE, JSON.stringify(pending));
      return true;
    } catch {
      return false;
    }
  }

  function load() {
    try {
      const pending = JSON.parse(localStorage.getItem(STORE));
      if (pending && isKey32(pending.code)) return { code: pending.code, topup: pending.topup === true, amount: canonicalAmount(String(pending.amount ?? '')) };
    } catch {
      // Unreadable storage is the same as nothing stored.
    }
    return null;
  }

  function forget() {
    try {
      localStorage.removeItem(STORE);
    } catch {
      // Nothing was stored, then.
    }
  }

  // Gateway

  const REQUEST = { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' };

  /** A fetch that gives up after its time limit, or as soon as the given controller aborts. */
  async function request(url, options, seconds, controller = new AbortController()) {
    const timer = setTimeout(() => controller.abort(), seconds * 1000);
    try {
      return await fetch(url, { ...REQUEST, ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** The payment terms, or null for anything but a well-formed reply: then sales count as not open. */
  async function fetchCatalog() {
    try {
      const reply = await request(`${API}/v1/catalog`, {}, 15);
      if (!reply.ok) return null;
      const catalog = await reply.json();
      return isKey32(catalog?.pay_to) && isKey32(catalog?.asset) ? { pay_to: catalog.pay_to, asset: catalog.asset } : null;
    } catch {
      return null;
    }
  }

  function claim(code, controller) {
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return request(`${API}/v1/keys/claim`, { method: 'POST', headers, body: JSON.stringify({ code }) }, 30, controller);
  }

  function retryAfter(reply) {
    const header = reply.headers.get('Retry-After');
    if (!header) return null;
    const seconds = /^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000;
    return Number.isFinite(seconds) ? Math.min(Math.max(seconds, 1), 600) : null;
  }

  /** The gateway's own words for a failure, for display as plain text only. */
  async function explanation(reply) {
    let text = '';
    try {
      text = await reply.text();
    } catch {
      return '';
    }
    try {
      const body = JSON.parse(text);
      const found = [body?.error?.message, body?.error, body?.message, body?.detail].find((x) => typeof x === 'string');
      return (found ?? '').slice(0, 300);
    } catch {
      return text.includes('<') ? '' : text.trim().slice(0, 300);
    }
  }

  // DOM

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'on') node.addEventListener('click', value);
      else if (name in node && name !== 'list') node[name] = value;
      else node.setAttribute(name, value);
    }
    node.append(...children);
    return node;
  }

  const primary = (text, on) => el('button', { type: 'button', className: 'buy-btn buy-primary', on }, text);
  const secondary = (text, on) => el('button', { type: 'button', className: 'buy-btn', on }, text);
  const actions = (...buttons) => el('div', { className: 'buy-actions' }, ...buttons);
  const para = (text, className = '') => el('p', { className }, text);

  function field(label, input) {
    const id = `buy-${input.name}`;
    Object.assign(input, { id, autocomplete: 'off', spellcheck: false });
    input.setAttribute('autocapitalize', 'off');
    return [el('label', { htmlFor: id }, label), input];
  }

  function show(title, ...nodes) {
    stop();
    const heading = el('h3', { tabIndex: -1 }, title);
    panel.replaceChildren(heading, ...nodes);
    start.hidden = true;
    panel.hidden = false;
    panel.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
  }

  function close() {
    stop();
    bearer = null;
    panel.replaceChildren();
    panel.hidden = true;
    start.hidden = false;
    buy.focus();
  }

  function copyBlock(label, text) {
    const copy = el('button', { type: 'button' }, 'Copy');
    if (navigator.clipboard) {
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = 'Copied';
        } catch {
          copy.textContent = 'Select by hand';
        }
        setTimeout(() => {
          copy.textContent = 'Copy';
        }, 1500);
      });
    } else {
      copy.hidden = true;
    }
    return el('div', { className: 'buy-block' }, el('div', { className: 'buy-bar' }, el('span', {}, label), copy), el('pre', {}, text));
  }

  /** Loads the QR generator when a payment needs it; resolves to false if it cannot load. */
  function loadQrLibrary() {
    qrLibrary ??= new Promise((resolve) => {
      const script = el('script', { src: '/assets/qrcode.js' });
      script.addEventListener('load', () => resolve(true));
      script.addEventListener('error', () => {
        qrLibrary = null;
        resolve(false);
      });
      document.head.append(script);
    });
    return qrLibrary;
  }

  function qrCode(text) {
    const code = qrcode(0, 'M');
    code.addData(text, 'Byte');
    code.make();
    const size = code.getModuleCount();
    const quiet = 4;
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (code.isDark(row, column)) path += `M${column + quiet} ${row + quiet}h1v1h-1z`;
      }
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const total = size + quiet * 2;
    svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
    svg.setAttribute('class', 'buy-qr');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code of the payment request. On a phone, use Open in wallet.');
    svg.setAttribute('shape-rendering', 'crispEdges');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', path);
    shape.setAttribute('fill', '#1A1714');
    svg.append(shape);
    return svg;
  }

  // Entry views

  function amountInput() {
    return el('input', { name: 'amount', value: '25', inputMode: 'decimal' });
  }

  function keyInput() {
    return el('input', { name: 'secret', type: 'password' });
  }

  function buyView() {
    const amount = amountInput();
    const error = para('', 'buy-note');
    const go = primary('Continue', () => begin(amount, null, error));
    show('Get a key', ...field('Amount in USD, 20 to 100', amount), error, actions(go, secondary('Back', close)));
    error.hidden = true;
  }

  function topupView() {
    const key = keyInput();
    const amount = amountInput();
    const error = para('', 'buy-note');
    const go = primary('Continue', () => begin(amount, key, error));
    show(
      'Top up an existing key',
      ...field('Existing key', key),
      para('Sent only to confirm the top-up. Never stored.', 'buy-note'),
      ...field('Amount in USD, 20 to 100', amount),
      error,
      actions(go, secondary('Back', close)),
    );
    error.hidden = true;
  }

  function fail(error, text) {
    error.textContent = text;
    error.hidden = false;
  }

  async function begin(amountField, keyField, error) {
    error.hidden = true;
    const amount = canonicalAmount(amountField.value);
    const key = keyField ? keyField.value.trim() : null;
    if (keyField && !isHeaderSafe(key)) return fail(error, 'Paste the key you want to top up.');
    if (!amount) return fail(error, 'Enter an amount from 20 to 100 USD, with at most two decimals.');
    if (!crypto.subtle) return fail(error, 'This browser cannot prepare the payment here. Open the page over https in a current browser.');
    bearer = key;
    if (keyField) keyField.value = '';
    await open({ code: newCode(), topup: Boolean(keyField), amount }, true);
  }

  const isHeaderSafe = (text) => /^[\x21-\x7e]{8,512}$/.test(text);

  function paidView() {
    const code = el('input', { name: 'code' });
    const key = keyInput();
    const error = para('', 'buy-note');
    const go = primary('Continue', () => {
      const value = code.value.trim();
      const secret = key.value.trim();
      if (!isKey32(value)) return fail(error, 'That is not a valid code. A code is about 44 characters, without 0, O, I or l.');
      if (secret && !isHeaderSafe(secret)) return fail(error, 'That does not look like a key. Leave it empty unless the payment was a top-up.');
      bearer = secret || null;
      key.value = '';
      return resume({ code: value, topup: Boolean(secret), amount: null });
    });
    show(
      'I already paid',
      ...field('Your code', code),
      ...field('Existing key, only if the payment was a top-up', key),
      error,
      actions(go, secondary('Back', close)),
    );
    error.hidden = true;
  }

  function askKeyView(pending) {
    const key = keyInput();
    const error = para('', 'buy-note');
    const go = primary('Continue', () => {
      const secret = key.value.trim();
      if (!isHeaderSafe(secret)) return fail(error, 'Paste the key you are topping up.');
      bearer = secret;
      key.value = '';
      return resume(pending);
    });
    show('Top up an existing key', para('A top-up is waiting. Paste the key again to confirm it: the key is never stored.'), ...field('Existing key', key), error, actions(go, forgetButton()));
    error.hidden = true;
  }

  function closedView(retry) {
    const again = primary('Check again', retry);
    show('Sales are not open yet', para('No address is shown until they are. Nothing was charged.'), actions(again, secondary('Back', close)));
  }

  // Payment view

  async function open(pending, fresh) {
    const preparing = el('div', { className: 'buy-status', role: 'status' });
    show('Preparing the payment', preparing);
    waiting(preparing, 'Checking the gateway.');
    const catalog = pending.amount ? await fetchCatalog() : null;
    if (fresh && !catalog) {
      closedView(async () => {
        await open(pending, true);
      });
      return;
    }
    const stored = save(pending);
    const reference = catalog ? await referenceOf(pending.code) : null;
    const hasQr = catalog ? await loadQrLibrary() : false;
    payView(pending, catalog, reference, stored, hasQr);
  }

  function resume(pending) {
    if (pending.topup && !bearer) return askKeyView(pending);
    return open(pending, false);
  }

  function forgetButton() {
    const button = secondary('Start over', () => {
      button.disabled = true;
      const confirm = el(
        'div',
        { className: 'buy-error' },
        para('This browser forgets the code. If you already paid, save it first: it is the only way to the result.'),
        actions(
          secondary('Forget the code', () => {
            forget();
            close();
          }),
          secondary('Keep it', () => {
            confirm.remove();
            button.disabled = false;
          }),
        ),
      );
      button.parentElement.after(confirm);
    });
    return button;
  }

  function payView(pending, catalog, reference, stored, hasQr) {
    const { code, topup, amount } = pending;
    const pay = el('div', {});
    if (catalog) {
      const url = payUrl(catalog, amount, reference, topup);
      pay.append(
        hasQr ? qrCode(url) : para('The QR did not load. Use the wallet link.'),
        actions(el('a', { href: url, className: 'buy-btn buy-primary' }, 'Open in wallet')),
        para('The wallet needs USDC plus a little SOL for the network fee. Exchange withdrawals are not supported: pay from a wallet.'),
      );
    } else {
      pay.hidden = true;
    }
    const keep = topup
      ? 'Save this code now. It finishes the top-up if this page closes. Keep the key at hand: it is not stored.'
      : 'Save this code now. It recovers the key if this page closes. Anyone holding it can take the key.';
    const details = el('div', {}, copyBlock('Your code', code), para(keep));
    if (!stored) details.append(para('This browser will not remember the code after a reload.'));
    const status = el('div', { className: 'buy-status', role: 'status' });
    const title = catalog ? `${topup ? 'Top up: pay' : 'Pay'} ${amount} USDC` : 'Waiting for your payment';
    show(title, el('div', { className: 'buy-pay' }, pay, details), status, actions(forgetButton()));
    watch(pending, pay, status);
  }

  function stop() {
    if (!session) return;
    session.stopped = true;
    session.abort?.abort();
    clearTimeout(session.timer);
    session.wake?.();
    session = null;
  }

  function waiting(status, text) {
    status.replaceChildren(el('div', { className: 'buy-strap', 'aria-hidden': 'true' }), para(text));
  }

  async function watch(pending, pay, status) {
    const run = { stopped: false, abort: null, timer: 0 };
    session = run;
    const started = Date.now();
    const pause = (seconds) =>
      new Promise((resolve) => {
        run.wake = resolve;
        run.timer = setTimeout(resolve, seconds * 1000);
      });
    waiting(status, 'Waiting for the payment. This page updates by itself.');
    while (!run.stopped) {
      let reply;
      try {
        run.abort = new AbortController();
        reply = await claim(pending.code, run.abort);
      } catch {
        if (run.stopped) return;
        waiting(status, 'The gateway does not answer. Still trying. Your code stays valid.');
        await pause(TROUBLE_WAIT);
        continue;
      }
      if (run.stopped) return;
      if (reply.status === 200) {
        let body = null;
        try {
          body = await reply.json();
        } catch {
          // Handled below as a reply without a result.
        }
        if (run.stopped) return;
        if (finish(pending, body)) return;
        refuse(pending, pay, status, 'The reply cannot be read', 'The gateway confirmed the claim but sent no usable result. Keep your code and try again.');
        return;
      }
      if (reply.status === 202) {
        const slow = Date.now() - started > SLOW_AFTER_MS;
        const clock = new Date().toLocaleTimeString();
        waiting(
          status,
          slow
            ? `Still waiting after 10 minutes, last check ${clock}. If the wallet shows the payment as sent, keep this page open or come back with your code.`
            : `Waiting for the payment. Last check ${clock}. This page updates by itself.`,
        );
        await pause(retryAfter(reply) ?? DEFAULT_WAIT);
        continue;
      }
      const words = await explanation(reply);
      if (run.stopped) return;
      if (reply.status === 429 || reply.status >= 500) {
        waiting(status, `${words || 'The gateway cannot answer right now.'} Still trying. Your code stays valid.`);
        await pause(retryAfter(reply) ?? TROUBLE_WAIT);
        continue;
      }
      refused(pending, pay, status, reply.status, words);
      return;
    }
  }

  function refused(pending, pay, status, code, words) {
    if ((code === 401 || code === 403) && bearer) {
      refuse(pending, pay, status, 'The key was refused', words || 'The gateway does not accept this key.', true);
      return;
    }
    if (/minimum|below|too low|under.?paid/i.test(words)) {
      refuse(pending, pay, status, 'Payment below the minimum', `The minimum is 20 USD. The gateway says: ${words}`);
      return;
    }
    refuse(pending, pay, status, 'The claim was refused', words || `The gateway answered ${code} and gave no reason.`);
  }

  function refuse(pending, pay, status, title, words, askKey = false) {
    pay.hidden = true;
    stop();
    const heading = panel.querySelector('h3');
    const before = heading.textContent;
    heading.textContent = title;
    const retry = askKey
      ? secondary('Use another key', () => {
          bearer = null;
          askKeyView(pending);
        })
      : secondary('Check again', () => {
          heading.textContent = before;
          pay.hidden = false;
          watch(pending, pay, status);
        });
    status.replaceChildren(
      el(
        'div',
        { className: 'buy-error' },
        para(words),
        el('p', {}, 'Keep your code. To report this: ', el('a', { href: '/support' }, 'Support'), '.'),
        actions(retry),
      ),
    );
  }

  // Result views

  function finish(pending, body) {
    if (!body || typeof body !== 'object') return false;
    if (pending.topup) {
      topupDoneView(body);
      return true;
    }
    if (typeof body.key !== 'string' || !/^[A-Za-z0-9._~+/=:-]{8,512}$/.test(body.key)) return false;
    keyView(body);
    return true;
  }

  function facts(body) {
    const lines = [];
    if (typeof body.alias === 'string') lines.push(`Alias: ${body.alias}`);
    if (Number.isFinite(body.max_budget_usd)) lines.push(`Budget: ${body.max_budget_usd} USD`);
    if (Number.isFinite(body.rpm_limit)) lines.push(`Rate limit: ${body.rpm_limit} requests per minute`);
    if (typeof body.transaction === 'string') lines.push(`Transaction: ${body.transaction}`);
    return lines.length ? [copyBlock('Receipt', lines.join('\n'))] : [];
  }

  function firstModel(models) {
    if (!Array.isArray(models)) return null;
    return models.find((id) => typeof id === 'string' && /^[\w./:-]+$/.test(id)) ?? null;
  }

  function keyView(body) {
    const model = firstModel(body.models);
    const claude = [`export ANTHROPIC_BASE_URL=${API}`, `export ANTHROPIC_AUTH_TOKEN=${body.key}`, ...(model ? [`export ANTHROPIC_MODEL=${model}`] : []), 'claude'];
    const cursor = [
      'Cursor Settings, Models:',
      `OpenAI API Key: ${body.key}`,
      `Override OpenAI Base URL: ${API}/v1`,
      ...(model ? [`Add model: ${model}`] : []),
    ];
    show(
      'Your key. Shown once.',
      copyBlock('Key', body.key),
      para('Anyone holding it can spend your balance.'),
      ...facts(body),
      copyBlock('Claude Code', claude.join('\n')),
      copyBlock('Cursor', cursor.join('\n')),
      ...(model ? [] : [el('p', {}, 'Model ids: ', el('a', { href: '/models' }, 'Models and prices'))]),
      actions(primary('I saved the key', acknowledge)),
    );
  }

  function topupDoneView(body) {
    bearer = null;
    show('Top-up confirmed', para('Credits added to your key. Your key stays the same.'), ...facts(body), actions(primary('Done', acknowledge)));
  }

  function acknowledge() {
    forget();
    bearer = null;
    close();
  }

  // Wiring

  buy.addEventListener('click', buyView);
  buy.disabled = false;
  for (const [id, view] of [
    ['buy-paid', paidView],
    ['buy-topup', topupView],
  ]) {
    const button = document.getElementById(id);
    button?.addEventListener('click', view);
    if (button) button.disabled = false;
  }

  const pending = load();
  if (pending) resume(pending);
})();
