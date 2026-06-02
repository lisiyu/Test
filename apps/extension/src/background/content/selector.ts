export function select(selector: string) {
  try {
    return document.querySelector(selector);
  } catch (e) {
    return null;
  }
}

// Improved visual selector:
// - uses an overlay element for highlight to avoid mutating page styles
// - shows a tooltip with the best selector and alternatives
// - supports keyboard: Enter to accept, Esc to cancel
// - debounces mousemove updates to reduce flicker
export function enableVisualSelector(callback: (selector: string) => void) {
  let current: Element | null = null;
  let raf = 0;
  let debounceTimer: any = null;

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '2147483646';
  overlay.style.pointerEvents = 'none';
  overlay.style.border = '2px solid #f90';
  overlay.style.background = 'rgba(255,153,0,0.08)';
  overlay.style.boxSizing = 'border-box';
  document.documentElement.appendChild(overlay);

  const tip = document.createElement('div');
  tip.style.position = 'fixed';
  tip.style.zIndex = '2147483647';
  tip.style.background = 'rgba(0,0,0,0.8)';
  tip.style.color = '#fff';
  tip.style.padding = '6px 8px';
  tip.style.borderRadius = '4px';
  tip.style.fontSize = '12px';
  tip.style.maxWidth = '600px';
  tip.style.pointerEvents = 'auto';
  tip.style.whiteSpace = 'pre-wrap';
  tip.style.display = 'none';
  document.documentElement.appendChild(tip);

  function computeSelectors(el: Element) {
    if (!el) return { best: '', all: [] };

    const escapeAttr = (v: string) => v.replace(/"/g, '\\"');
    const tag = (n: Element) => n.tagName.toLowerCase();

    const candidates: string[] = [];

    if ((el as Element).id) candidates.push(`${tag(el)}#${(el as Element).id}`);

    const dataAttrs = ['data-testid', 'data-test', 'data-qa', 'data-name'];
    for (const a of dataAttrs) {
      const v = el.getAttribute(a);
      if (v) candidates.push(`${tag(el)}[${a}="${escapeAttr(v)}"]`);
    }

    const nameAttr = el.getAttribute('name');
    if (nameAttr) candidates.push(`${tag(el)}[name="${escapeAttr(nameAttr)}"]`);

    const classes = Array.from(el.classList || []);
    if (classes.length > 0) {
      // try combinations of up to 3 classes for better specificity
      const combos: string[] = [];
      for (let i = 1; i <= Math.min(3, classes.length); i++) {
        combos.push(classes.slice(0, i).join('.'));
      }
      combos.forEach(c => candidates.push(`${tag(el)}.${c}`));
    }

    function buildPath(n: Element) {
      const parts: string[] = [];
      let node: Element | null = n;
      while (node && node.tagName && node.tagName.toLowerCase() !== 'html') {
        let part = tag(node);
        if (node.id) { part += `#${node.id}`; parts.unshift(part); break; }
        const cls = Array.from(node.classList || []).slice(0,2).join('.');
        if (cls) part += `.${cls}`;
        const parent = node.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter(c => c.tagName === node.tagName);
          if (sameTag.length > 1) {
            const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
            part += `:nth-child(${idx})`;
          }
        }
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(' > ');
    }

    const valid: string[] = [];
    for (const c of candidates) {
      try {
        const found = document.querySelectorAll(c);
        if (found && found.length === 1) valid.push(c);
      } catch (e) { /* skip invalid */ }
    }

    if (valid.length > 0) return { best: valid[0], all: valid };
    return { best: buildPath(el), all: [buildPath(el)] };
  }

  function updateOverlayFor(target: Element | null, clientX?: number, clientY?: number) {
    if (!target) {
      overlay.style.display = 'none';
      tip.style.display = 'none';
      return;
    }
    const r = (target as HTMLElement).getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = `${Math.max(0, r.left)}px`;
    overlay.style.top = `${Math.max(0, r.top)}px`;
    overlay.style.width = `${Math.max(0, r.width)}px`;
    overlay.style.height = `${Math.max(0, r.height)}px`;

    const sels = computeSelectors(target);
    tip.textContent = sels.best + (sels.all.length > 1 ? '\n\nAlternatives:\n' + sels.all.slice(1).join('\n') : '');
    tip.style.display = 'block';

    // position tip near cursor if available, otherwise above element
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const tx = clientX + 12;
      let ty = clientY + 12;
      // keep inside viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tipRect = tip.getBoundingClientRect();
      if (tx + tipRect.width > vw) tip.style.left = `${Math.max(8, vw - tipRect.width - 8)}px`; else tip.style.left = `${tx}px`;
      if (ty + tipRect.height > vh) tip.style.top = `${Math.max(8, vh - tipRect.height - 8)}px`; else tip.style.top = `${ty}px`;
    } else {
      tip.style.left = `${Math.max(8, r.left)}px`;
      tip.style.top = `${Math.max(8, r.top - 8)}px`;
    }
  }

  function onMove(e: MouseEvent) {
    e.stopPropagation();
    // debounce to avoid thrashing
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const t = e.target as Element;
      if (t !== current) {
        current = t;
        updateOverlayFor(current, e.clientX, e.clientY);
      }
    }, 50);
  }

  function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (current) {
      const sel = computeSelectors(current).best;
      callback(sel);
    }
    disable();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      disable();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (current) {
        const sel = computeSelectors(current).best;
        callback(sel);
      }
      disable();
    }
  }

  function disable() {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
    if (tip.parentElement) tip.parentElement.removeChild(tip);
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  return disable;
}
