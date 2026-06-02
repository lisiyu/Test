import { extract } from './extractor';
import { enableVisualSelector } from './selector';

console.log('content script initialized');

chrome.storage.local.get(['config'], (res) => {
  const config = res.config || {};
  tryAutoLogin(config);
});

// respond to messages from background
chrome.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'captureForSend') {
    const data = extract(msg.info);
    chrome.storage.local.set({ lastExtract: data }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg?.type === 'fillFromLast' || msg?.type === 'tryAutoFillOnLoad') {
    chrome.storage.local.get(['lastExtract', 'config'], (res) => {
      const last = res.lastExtract || {};
      const config = res.config || {};
      tryFillFromData(last, config);
    });
  }

  if (msg?.type === 'startVisualSelect') {
    const role = msg.role || 'A';
    const disable = enableVisualSelector((selector) => {
      chrome.runtime.sendMessage({ type: 'visualSelectorResult', selector, role });
      if (disable) disable();
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

function tryAutoLogin(config: any) {
  if (!config) return;
  const href = location.href;
  if (config.pageALoginUrl && config.autoLoginA && href.includes(config.pageALoginUrl)) {
    doAutoLogin(config, 'A');
  }
  if (config.pageBLoginUrl && config.autoLoginB && href.includes(config.pageBLoginUrl)) {
    doAutoLogin(config, 'B');
  }
}

function doAutoLogin(config: any, role: 'A' | 'B') {
  const loginConfig = role === 'A' ? config.pageALogin || {} : config.pageBLogin || {};
  if (!loginConfig) return;

  if (config.credentialType === 'certificate') {
    if (loginConfig.certificateSelector && config.certificate) {
      const certEl = document.querySelector(loginConfig.certificateSelector) as HTMLInputElement;
      if (certEl) {
        certEl.value = config.certificate;
        certEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } else {
    if (loginConfig.usernameSelector && config.username) {
      const userEl = document.querySelector(loginConfig.usernameSelector) as HTMLInputElement;
      if (userEl) {
        userEl.value = config.username;
        userEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (loginConfig.passwordSelector && config.password) {
      const passEl = document.querySelector(loginConfig.passwordSelector) as HTMLInputElement;
      if (passEl) {
        passEl.value = config.password;
        passEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  if (loginConfig.submitSelector) {
    const submitEl = document.querySelector(loginConfig.submitSelector) as HTMLElement;
    if (submitEl) {
      submitEl.click();
    }
  }
}
