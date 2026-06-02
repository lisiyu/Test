import { dispatchFlow } from './flowDispatcher';

export function createContextMenu() {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sendToTarget',
      title: 'Send to target',
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
  if (info.menuItemId === 'sendToTarget') {
    // ask the content script in the current tab to capture data,
    // then dispatch the flow (API send or open Page B) centrally
    chrome.tabs.sendMessage(tab.id, { type: 'captureForSend', info }, () => {
      dispatchFlow({ type: 'sendToTarget', info, tabId: tab.id });
    });
  }

  if (info.menuItemId === 'fillFields') {
    // invoke fill on the current tab (useful when already on B)
    chrome.tabs.sendMessage(tab.id, { type: 'fillFromLast' });
  }
});
