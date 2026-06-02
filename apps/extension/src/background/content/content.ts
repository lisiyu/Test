import { extract } from './extractor';

console.log('content script initialized');

// respond to messages from background
chrome.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'captureForSend') {
    // perform extraction according to configured mappings
    const data = extract(msg.info);
    // save to storage as lastExtract
    chrome.storage.local.set({ lastExtract: data }, () => {
      sendResponse({ ok: true });
    });
    // indicate async response
    return true;
  }

  if (msg?.type === 'fillFromLast' || msg?.type === 'tryAutoFillOnLoad') {
    chrome.storage.local.get(['lastExtract', 'config'], (res) => {
      const last = res.lastExtract || {};
      const config = res.config || {};
      // attempt to fill fields on this page using config mappings
      tryFillFromData(last, config);
    });
  }
});

function tryFillFromData(data: any, config: any) {
  if (!data || !config || !config.mappings) return;
  const urlMatches = !config.pageBUrl || location.href.includes(config.pageBUrl);
  if (!urlMatches) return;

  for (const map of config.mappings) {
    try {
      const targetEl = document.querySelector(map.selectorB);
      if (targetEl) {
        (targetEl as HTMLInputElement).value = data[map.fieldA] ?? '';
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      // ignore
    }
  }
}
