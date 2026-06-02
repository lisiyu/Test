"use strict";
(() => {
  // src/background/flowDispatcher.ts
  async function dispatchFlow(message) {
    console.log("dispatchFlow", message);
    try {
      if (!message || message.type !== "sendToTarget")
        return;
      const info = message.info;
      const tabId = message.tabId;
      const storageRes = await new Promise((resolve) => {
        chrome.storage.local.get(["config", "lastExtract"], (r) => resolve(r));
      });
      const config = storageRes.config || {};
      const lastExtract = storageRes.lastExtract || {};
      if (config.pageBTargetType === "api" && config.apiUrl) {
        const payload = {};
        (config.mappings || []).forEach((m) => {
          const key = m.apiField || m.fieldA;
          payload[key] = lastExtract[m.fieldA];
        });
        let headers = {};
        if (config.apiHeaders) {
          try {
            headers = JSON.parse(config.apiHeaders);
          } catch (e) {
            console.warn("Invalid apiHeaders JSON");
          }
        }
        if (config.credentialType === "password" && config.username && config.password) {
          headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
        }
        const method = (config.apiMethod || "POST").toUpperCase();
        const fetchOpts = { method, headers };
        let requestUrl = config.apiUrl;
        if (method === "GET") {
          const url = new URL(config.apiUrl);
          Object.keys(payload).forEach((k) => url.searchParams.append(k, payload[k] ?? ""));
          requestUrl = url.toString();
        } else {
          headers["Content-Type"] = headers["Content-Type"] || "application/json";
          fetchOpts.body = JSON.stringify(payload);
        }
        try {
          const response = await fetch(requestUrl, fetchOpts);
          const body = await response.text();
          chrome.storage.local.set({
            lastApiRequest: { url: requestUrl, method, headers, payload },
            lastApiResult: { status: response.status, statusText: response.statusText, body },
            lastApiError: null
          });
        } catch (err) {
          chrome.storage.local.set({
            lastApiRequest: { url: requestUrl, method, headers, payload },
            lastApiResult: null,
            lastApiError: err?.message || String(err)
          });
        }
      } else {
        const bUrl = config.pageBUrl || "about:blank";
        chrome.tabs.create({ url: bUrl });
      }
    } catch (e) {
      console.error("dispatchFlow error", e);
    }
  }

  // src/background/contextMenu.ts
  function createContextMenu() {
    if (typeof chrome === "undefined" || !chrome.contextMenus)
      return;
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "sendToTarget",
        title: "Send to target",
        contexts: ["selection", "all"]
      });
      chrome.contextMenus.create({
        id: "fillFields",
        title: "Fill fields (from last extract)",
        contexts: ["all"]
      });
    });
  }
  createContextMenu();
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id)
      return;
    if (info.menuItemId === "sendToTarget") {
      chrome.tabs.sendMessage(tab.id, { type: "captureForSend", info }, () => {
        dispatchFlow({ type: "sendToTarget", info, tabId: tab.id });
      });
    }
    if (info.menuItemId === "fillFields") {
      chrome.tabs.sendMessage(tab.id, { type: "fillFromLast" });
    }
  });

  // src/background/background.ts
  console.log("background initialized");
  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      chrome.tabs.sendMessage(tabId, { type: "tryAutoFillOnLoad" }, () => {
      });
    }
  });
})();
