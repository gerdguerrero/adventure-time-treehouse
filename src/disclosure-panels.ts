/** Mutually exclusive, non-modal menus. Native buttons keep their keyboard semantics. */
export function disclosurePanels(entries: { button: HTMLButtonElement; panel: HTMLElement }[]) {
  let active: typeof entries[number] | undefined;
  function close(restoreFocus = false) {
    if (!active) return false;
    const previous = active;
    previous.panel.hidden = true;
    previous.button.setAttribute('aria-expanded', 'false');
    active = undefined;
    if (restoreFocus) previous.button.focus({ preventScroll: true });
    return true;
  }
  function open(button: HTMLButtonElement) {
    const entry = entries.find(item => item.button === button);
    if (!entry) return;
    close();
    active = entry;
    entry.panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    (entry.panel.querySelector<HTMLElement>('button[aria-pressed=true]') ?? entry.panel.querySelector<HTMLElement>('button,select,a[href]'))?.focus({ preventScroll: true });
  }
  for (const entry of entries) {
    entry.button.onclick = () => active === entry ? close(true) : open(entry.button);
    entry.panel.addEventListener('focusout', event => {
      const next = event.relatedTarget;
      if (active === entry && next instanceof Node && !entry.panel.contains(next) && next !== entry.button) close();
    });
  }
  document.addEventListener('pointerdown', event => {
    if (active && event.target instanceof Node && !active.panel.contains(event.target) && !active.button.contains(event.target)) close();
  });
  return { close, open };
}
