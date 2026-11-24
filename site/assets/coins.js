// The coins page: buy a key with a coin other than USDC on Solana. The payment service (pay.sealedin.ai, outside this repo
// and outside the enclave) gives an address per order and shows the key to the holder of the order's claim secret once the
// payment confirms. The secret stays in this browser's storage until the visitor starts over; the key is never stored here.
(() => {
  const PAY = 'https://pay.sealedin.ai';
  const STORE = 'sealedin.coin-order';
  const REPORTED = 'sealedin.reported-coin-order';
  const SITE_MAX_USD = 100;
  const POLL_SECONDS = 20;
  const FIRST = ['xmr', 'btc', 'trc20/usdt', 'ltc', 'eth', 'erc20/usdt', 'erc20/usdc', 'bep20/usdt', 'base/usdc', 'sol/usdt', 'ton/usdt'];
  const REQUEST = { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' };

  const panel = document.getElementById('coins-flow');
  let timer = null;
  let qrLibrary = null;

  // Analytics get the event name and the amount, never the order, the address, the secret or the key.
  function track(event, usd, extra = {}) {
    const item = { item_id: 'api_key_coin', item_name: 'API key, other coin', quantity: 1, price: usd };
    try {
      window.gtag?.('event', event, { items: [item], currency: 'USD', value: usd, ...extra });
    } catch {
      // Analytics never gets in the way of a payment.
    }
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'on') node.addEventListener('click', value);
      else node[name] = value;
    }
    node.append(...children);
    return node;
  }

  const button = (text, on, primary = false) => el('button', { type: 'button', className: primary ? 'coins-btn coins-primary' : 'coins-btn', on }, text);

  function show(title, ...nodes) {
    clearTimeout(timer);
    const heading = el('h2', { tabIndex: -1 }, title);
    panel.replaceChildren(heading, ...nodes);
    return heading;
  }

  function copyBlock(label, text) {
    const copy = el('button', { type: 'button' }, 'Copy');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Select by hand';
      }
    });
    return el('div', { className: 'coins-block' }, el('div', { className: 'coins-bar' }, el('span', {}, label), copy), el('pre', {}, text));
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const limit = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(PAY + path, { ...REQUEST, ...options, signal: controller.signal });
    } finally {
      clearTimeout(limit);
    }
  }

  function load() {
    try {
      const order = JSON.parse(localStorage.getItem(STORE));
      return typeof order?.order === 'string' && typeof order?.claim === 'string' ? order : null;
    } catch {
      return null;
    }
  }

  function save(order) {
    try {
      localStorage.setItem(STORE, JSON.stringify({ order: order.order, claim: order.claim }));
      return true;
    } catch {
      return false;
    }
  }

  function forget() {
    try {
      localStorage.removeItem(STORE);
    } catch {
      // Nothing was stored, then.
    }
  }

  function loadQrLibrary() {
    qrLibrary ??= new Promise((resolve) => {
      const script = el('script', { src: '/assets/qrcode.js' });
      script.addEventListener('load', () => resolve(true));
      script.addEventListener('error', () => resolve(false));
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
    svg.setAttribute('viewBox', `0 0 ${size + quiet * 2} ${size + quiet * 2}`);
    svg.setAttribute('class', 'coins-qr');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code of the address. It carries the address only: enter the amount yourself.');
    svg.setAttribute('shape-rendering', 'crispEdges');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', path);
    shape.setAttribute('fill', '#1A1714');
    svg.append(shape);
    return svg;
  }

  const rank = (ticker) => (FIRST.includes(ticker) ? FIRST.indexOf(ticker) : FIRST.length);

  async function chooseView(note = '') {
    show('Pick a coin', el('p', {}, 'Loading the list of coins.'));
    let list;
    try {
      const reply = await request('/pay/coins');
      list = reply.ok ? await reply.json() : null;
    } catch {
      list = null;
    }
    if (!Array.isArray(list?.coins) || list.coins.length === 0) {
      show('Not open yet', el('p', {}, 'Payments in other coins are not available right now. USDC on Solana works on the home page.'), button('Try again', () => chooseView()));
      return;
    }
    const coins = list.coins.toSorted((a, b) => rank(a.ticker) - rank(b.ticker) || a.ticker.localeCompare(b.ticker));
    const select = el('select', { id: 'coins-coin' }, ...coins.map((coin) => el('option', { value: coin.ticker }, `${coin.name} (${coin.ticker}), minimum ${coin.minimum}`)));
    const maxUsd = Math.min(Number(list.max_usd) || SITE_MAX_USD, SITE_MAX_USD);
    const minUsd = Number(list.min_usd) || 20;
    const amount = el('input', { id: 'coins-usd', value: String(Math.max(25, minUsd)), inputMode: 'decimal', autocomplete: 'off' });
    const error = el('p', { className: 'coins-error', hidden: !note }, note);
    const go = button('Get the address', async () => {
      const usd = Number(amount.value);
      if (!(usd >= minUsd && usd <= maxUsd)) {
        error.textContent = `Choose ${minUsd} to ${maxUsd} USD.`;
        error.hidden = false;
        return;
      }
      go.disabled = true;
      await orderView(select.value, usd);
    }, true);
    show('Pick a coin', el('label', { htmlFor: 'coins-coin' }, 'Coin'), select, el('label', { htmlFor: 'coins-usd' }, `Amount in USD, ${minUsd} to ${maxUsd}`), amount, error, el('div', { className: 'coins-actions' }, go));
  }

  async function orderView(ticker, usd) {
    let order = null;
    let words = 'We could not get an address. Nothing was charged.';
    try {
      const reply = await request('/pay/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker, usd }) });
      if (reply.status === 201) order = await reply.json();
      else if (reply.status === 429) words = 'Too many orders right now. Try again in a minute.';
    } catch {
      // The words above hold.
    }
    if (typeof order?.address !== 'string' || typeof order?.claim !== 'string') {
      await chooseView(words);
      return;
    }
    if (!save(order)) {
      await chooseView('This browser does not let the page keep the secret that reads the key, so paying here would lose it. Allow storage for this site, or use another browser.');
      return;
    }
    track('begin_checkout', order.usd);
    await payView(order, order.claim);
  }

  async function payView(order, claim) {
    const status = el('p', { className: 'coins-status' }, 'Waiting for the payment. This page checks by itself.');
    const until = new Date(order.expires_at);
    const price = Number.isNaN(until.getTime()) ? '' : ` This price holds until ${until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}; a later payment is priced when it arrives.`;
    const nodes = [
      el('p', {}, `Send ${order.amount} ${order.ticker} for ${order.usd} USD of credit, in one payment.${price}`),
      copyBlock('Amount', order.amount),
      copyBlock(`Address, ${order.ticker}`, order.address),
    ];
    if (await loadQrLibrary()) nodes.push(qrCode(order.address));
    nodes.push(status, el('p', {}, 'Leave this page open or come back to it in this browser. Starting over forgets this order: a payment already sent to it would then need support to find its key.'), el('div', { className: 'coins-actions' }, button('Start over', () => {
      forget();
      chooseView();
    })));
    show('Send the payment', ...nodes).focus({ preventScroll: true });
    poll(order.order, claim, status);
  }

  function poll(id, claim, status) {
    timer = setTimeout(async () => {
      let order = null;
      try {
        const reply = await request(`/pay/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${claim}` } });
        if (reply.ok) order = await reply.json();
        else if (reply.status === 404) status.textContent = 'The service no longer knows this order. If you paid, write to support with the address above.';
      } catch {
        // The next round tries again.
      }
      if (order?.status === 'paid') keyView(order);
      else poll(id, claim, status);
    }, POLL_SECONDS * 1000);
  }

  function reportOnce(order) {
    try {
      if (localStorage.getItem(REPORTED) === order.order) return;
      localStorage.setItem(REPORTED, order.order);
      track('purchase', Number(order.credited_usd) || 0);
    } catch {
      // Without storage a repeat cannot be ruled out, so nothing is sent.
    }
  }

  function keyView(order) {
    const again = el('div', { className: 'coins-actions' }, button('Buy another key', () => {
      forget();
      chooseView();
    }));
    if (!order.key) {
      show('Paid, key not shown', el('p', {}, 'The payment arrived, but there is no key to show: it was too small to credit, or the key is no longer kept here. Write to support with the address you paid.'), again).focus();
      return;
    }
    reportOnce(order);
    show('Your key', el('p', {}, `Paid: ${order.credited_usd} USD of credit. Save the key now. It stays readable from this browser for 7 days, then never again.`), copyBlock('Key', order.key), again).focus();
  }

  async function resume(stored) {
    show('Your order', el('p', {}, 'Loading your order.'));
    try {
      const reply = await request(`/pay/orders/${encodeURIComponent(stored.order)}`, { headers: { Authorization: `Bearer ${stored.claim}` } });
      if (reply.ok) {
        const order = await reply.json();
        if (order.status === 'paid') keyView(order);
        else await payView(order, stored.claim);
        return;
      }
      if (reply.status === 404) {
        forget();
        await chooseView();
        return;
      }
    } catch {
      // Shown below.
    }
    show('Your order', el('p', {}, 'We could not load your order. It is still kept in this browser.'), el('div', { className: 'coins-actions' }, button('Try again', () => resume(stored), true)));
  }

  const stored = load();
  if (stored) resume(stored);
  else chooseView();
})();
