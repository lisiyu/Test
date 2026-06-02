import './contextMenu';
import './flowDispatcher';

console.log('background initialized');

// When a new tab is updated to complete, attempt to fill if there is lastExtract
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete') {
		// notify the tab to try filling from last extract
		chrome.tabs.sendMessage(tabId, { type: 'tryAutoFillOnLoad' }, () => {
			// ignore errors (no content script on that tab)
		});
	}
});
