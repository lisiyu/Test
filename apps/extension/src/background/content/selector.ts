export function select(selector: string) {
  try {
    return document.querySelector(selector);
  } catch (e) {
    return null;
  }
}

// Visual selection mode: highlight hovered elements and on click return selector
export function enableVisualSelector(callback: (selector: string) => void) {
  let current: HTMLElement | null = null;
  function mouseOver(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (current && current !== t) current.style.outline = '';
    current = t;
    try { t.style.outline = '2px solid #f90'; } catch (e) {}
    e.stopPropagation();
  }

  function clickHandler(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (current) {
      const sel = computeSelector(current);
      callback(sel);
    }
    disable();
  }

  function disable() {
    document.removeEventListener('mouseover', mouseOver, true);
    document.removeEventListener('click', clickHandler, true);
    if (current) current.style.outline = '';
  }

  function computeSelector(el: Element) {
    if (!el) return '';
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      } else {
        const cls = node.className?.toString().split(/\s+/).filter(Boolean).join('.');
        if (cls) part += `.${cls}`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  document.addEventListener('mouseover', mouseOver, true);
  document.addEventListener('click', clickHandler, true);
  return disable;
}
