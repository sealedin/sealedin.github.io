// Copy buttons render disabled and hold their space; this enables them.
for (const button of document.querySelectorAll('[data-copy]')) {
  const source = document.getElementById(button.dataset.copy);
  if (!source || !navigator.clipboard) continue;
  const label = button.textContent;
  button.disabled = false;
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(source.textContent);
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = label;
    }, 1500);
  });
}
