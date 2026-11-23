// The bonus page. The bonus service returns the visitor here with the outcome, and once the key, in the address fragment.
// This file loads first in the head, before any tag: it takes the fragment out of the address, so no analytics request and
// no history entry carries the key. The key stays in this page's memory only and is gone on reload.
const outcome = (() => {
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (!fragment.has('result')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return { result: fragment.get('result'), key: fragment.get('key') || '' };
})();

// What each outcome says. retry offers the sign-in again.
const OUTCOMES = {
  issued: { title: 'Your key', text: 'Save it now: it is shown once and cannot be recovered. It works as any key does, and paying later tops it up.' },
  not_following: { title: 'Follow us first', text: 'The bonus goes to accounts that follow @sealedinai on X. Follow, then sign in again.', retry: true },
  too_new: { title: 'Account too new', text: 'The bonus goes to X accounts older than 30 days.' },
  taken: { title: 'Already taken', text: 'This X account got its bonus before. The key was shown then and cannot be shown again.' },
  over: { title: 'The promotion is over', text: 'Every bonus has been given. You can still buy a key on the home page.' },
  expired: { title: 'Sign-in expired', text: 'Start again from this browser.', retry: true },
  cancelled: { title: 'Sign-in cancelled', text: 'Nothing was issued.', retry: true },
  busy: { title: 'Busy', text: 'Too many sign-ins right now. Try again in a minute.', retry: true },
  unavailable: { title: 'Try again', text: 'We could not finish the check. Nothing was issued.', retry: true },
};

// Analytics get the event name and the outcome, never the key. They may be blocked or absent; the page does not depend on them.
function track(event, params) {
  try {
    window.gtag?.('event', event, params || {});
  } catch {
    // Nothing to do.
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function show(box) {
  const known = Object.hasOwn(OUTCOMES, outcome.result) && (outcome.result !== 'issued' || outcome.key);
  const result = known ? outcome.result : 'unavailable';
  const view = OUTCOMES[result];
  box.append(element('h2', view.title), element('p', view.text));
  if (result === 'issued') {
    const block = element('div', '', 'bonus-key');
    const copy = element('button', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(outcome.key);
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Select and copy';
      }
    });
    block.append(element('code', outcome.key), copy);
    box.append(block);
    track('sign_up', { method: 'x' });
  } else {
    track('bonus_refused', { reason: result });
  }
  box.hidden = false;
  box.focus();
  document.getElementById('bonus-start').hidden = !view.retry;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bonus-start').addEventListener('click', () => track('bonus_start'));
  if (outcome) show(document.getElementById('bonus-result'));
});
