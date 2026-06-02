import { select } from './selector';

// Extract data based on stored config mappings. If info contains context menu info,
// we can try to use the clicked element as a base for row-relative selectors.
export function extract(info?: any) {
  const result: Record<string, any> = {};

  // load config synchronously via chrome.storage (but storage.get is async), so
  // for simplicity try to read window.__EXT_CONFIG if options page injected it,
  // otherwise rely on default simple extraction.
  const mappings = (window as any).__EXT_CONFIG?.mappings || [];

  if (mappings.length === 0) {
    // fallback: return title and url
    const titleEl = select('title');
    return {
      title: titleEl ? titleEl.textContent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
    };
  }

  let baseElement: Element | null = null;
  if (info && info.srcElementId) {
    baseElement = document.getElementById(info.srcElementId) || null;
  } else if (info && info.menuItemId && window.getSelection) {
    // try to use the node that was right-clicked via selection anchorNode
    const sel = window.getSelection();
    baseElement = sel && sel.anchorNode ? (sel.anchorNode as Node).parentElement : null;
  }

  for (const m of mappings) {
    try {
      let el: Element | null = null;
      if (m.selectorA) {
        // if selectorA is relative (starts with '.' or similar) and baseElement exists, try querySelector on it
        if (baseElement && (m.selectorA.startsWith('.') || m.selectorA.startsWith('[') || m.selectorA.startsWith(':'))) {
          el = baseElement.querySelector(m.selectorA);
        } else {
          el = document.querySelector(m.selectorA);
        }
      }

      if (el) {
        if ((el as HTMLInputElement).value !== undefined) {
          result[m.fieldA] = (el as HTMLInputElement).value;
        } else {
          result[m.fieldA] = el.textContent?.trim() ?? '';
        }
      } else {
        result[m.fieldA] = null;
      }
    } catch (e) {
      result[m.fieldA] = null;
    }
  }

  return result;
}
