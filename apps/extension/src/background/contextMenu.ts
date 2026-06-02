export function createContextMenu() {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sendToB',
      title: 'Send to Web B',
      contexts: ['selection', 'all'],
    });

    chrome.contextMenus.create({
      id: 'fillFields',
      title: 'Fill fields (from last extract)',
      contexts: ['all'],
    });
  });
}

createContextMenu();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'sendToB') {
    // ask the content script in the current tab to capture data
    chrome.tabs.sendMessage(tab.id, { type: 'captureForSend', info }, () => {
      // open B in a new tab after capture; content script will store the data in chrome.storage
      chrome.storage.local.get(['config'], (res) => {
        const config = res.config || {};
        const bUrl = config.pageBUrl || 'about:blank';
        chrome.tabs.create({ url: bUrl });
      });
    });
  }

  if (info.menuItemId === 'fillFields') {
    // invoke fill on the current tab (useful when already on B)
    chrome.tabs.sendMessage(tab.id, { type: 'fillFromLast' });
  }
});
