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
    // ask the content script in the current tab to capture data
    chrome.tabs.sendMessage(tab.id, { type: 'captureForSend', info }, () => {
      // after capture, either open B or send to API depending on config
      chrome.storage.local.get(['config','lastExtract'], (res) => {
        const config = res.config || {};
        const lastExtract = res.lastExtract || {};
        if (config.pageBTargetType === 'api' && config.apiUrl) {
          // prepare payload using mappings
          const payload: Record<string, any> = {};
          (config.mappings || []).forEach((m: any) => {
            const key = m.apiField || m.fieldA;
            payload[key] = lastExtract[m.fieldA];
          });

          // build headers
          let headers: Record<string,string> = {};
          if (config.apiHeaders) {
            try { headers = JSON.parse(config.apiHeaders); } catch(e) { console.warn('Invalid apiHeaders JSON'); }
          }

          // basic auth support
          if (config.credentialType === 'password' && config.username && config.password) {
            const token = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${token}`;
          }

          const method = (config.apiMethod || 'POST').toUpperCase();
          const fetchOpts: any = { method, headers };
          let requestUrl = config.apiUrl;
          if (method === 'GET') {
            const url = new URL(config.apiUrl);
            Object.keys(payload).forEach(k => url.searchParams.append(k, payload[k] ?? ''));
            requestUrl = url.toString();
          } else {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            fetchOpts.body = JSON.stringify(payload);
          }

          fetch(requestUrl, fetchOpts)
            .then(async (response) => {
              const body = await response.text();
              chrome.storage.local.set({
                lastApiRequest: { url: requestUrl, method, headers, payload },
                lastApiResult: { status: response.status, statusText: response.statusText, body },
                lastApiError: null,
              });
            })
            .catch((err) => {
              chrome.storage.local.set({
                lastApiRequest: { url: requestUrl, method, headers, payload },
                lastApiResult: null,
                lastApiError: err?.message || String(err),
              });
              console.error(err);
            });
        } else {
          const bUrl = config.pageBUrl || 'about:blank';
          chrome.tabs.create({ url: bUrl });
        }
      });
    });
  }

  if (info.menuItemId === 'fillFields') {
    // invoke fill on the current tab (useful when already on B)
    chrome.tabs.sendMessage(tab.id, { type: 'fillFromLast' });
  }
});
