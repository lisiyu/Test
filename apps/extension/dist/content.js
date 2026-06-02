"use strict";
(() => {
  // src/background/content/selector.ts
  function select(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }
  function enableVisualSelector(callback) {
    let current = null;
    let raf = 0;
    let debounceTimer = null;
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.zIndex = "2147483646";
    overlay.style.pointerEvents = "none";
    overlay.style.border = "2px solid #f90";
    overlay.style.background = "rgba(255,153,0,0.08)";
    overlay.style.boxSizing = "border-box";
    document.documentElement.appendChild(overlay);
    const tip = document.createElement("div");
    tip.style.position = "fixed";
    tip.style.zIndex = "2147483647";
    tip.style.background = "rgba(0,0,0,0.8)";
    tip.style.color = "#fff";
    tip.style.padding = "6px 8px";
    tip.style.borderRadius = "4px";
    tip.style.fontSize = "12px";
    tip.style.maxWidth = "600px";
    tip.style.pointerEvents = "auto";
    tip.style.whiteSpace = "pre-wrap";
    tip.style.display = "none";
    document.documentElement.appendChild(tip);
    function computeSelectors(el) {
      if (!el)
        return { best: "", all: [] };
      const escapeAttr = (v) => v.replace(/"/g, '\\"');
      const tag = (n) => n.tagName.toLowerCase();
      const candidates = [];
      if (el.id)
        candidates.push(`${tag(el)}#${el.id}`);
      const dataAttrs = ["data-testid", "data-test", "data-qa", "data-name"];
      for (const a of dataAttrs) {
        const v = el.getAttribute(a);
        if (v)
          candidates.push(`${tag(el)}[${a}="${escapeAttr(v)}"]`);
      }
      const nameAttr = el.getAttribute("name");
      if (nameAttr)
        candidates.push(`${tag(el)}[name="${escapeAttr(nameAttr)}"]`);
      const classes = Array.from(el.classList || []);
      if (classes.length > 0) {
        const combos = [];
        for (let i = 1; i <= Math.min(3, classes.length); i++) {
          combos.push(classes.slice(0, i).join("."));
        }
        combos.forEach((c) => candidates.push(`${tag(el)}.${c}`));
      }
      function buildPath(n) {
        const parts = [];
        let node = n;
        while (node && node.tagName && node.tagName.toLowerCase() !== "html") {
          let part = tag(node);
          if (node.id) {
            part += `#${node.id}`;
            parts.unshift(part);
            break;
          }
          const cls = Array.from(node.classList || []).slice(0, 2).join(".");
          if (cls)
            part += `.${cls}`;
          const parent = node.parentElement;
          if (parent) {
            const sameTag = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (sameTag.length > 1) {
              const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
              part += `:nth-child(${idx})`;
            }
          }
          parts.unshift(part);
          node = node.parentElement;
        }
        return parts.join(" > ");
      }
      const valid = [];
      for (const c of candidates) {
        try {
          const found = document.querySelectorAll(c);
          if (found && found.length === 1)
            valid.push(c);
        } catch (e) {
        }
      }
      if (valid.length > 0)
        return { best: valid[0], all: valid };
      return { best: buildPath(el), all: [buildPath(el)] };
    }
    function updateOverlayFor(target, clientX, clientY) {
      if (!target) {
        overlay.style.display = "none";
        tip.style.display = "none";
        return;
      }
      const r = target.getBoundingClientRect();
      overlay.style.display = "block";
      overlay.style.left = `${Math.max(0, r.left)}px`;
      overlay.style.top = `${Math.max(0, r.top)}px`;
      overlay.style.width = `${Math.max(0, r.width)}px`;
      overlay.style.height = `${Math.max(0, r.height)}px`;
      const sels = computeSelectors(target);
      let html = `<div style="display:flex;gap:8px;align-items:center;"><button id=ce-copy style="padding:4px 6px;border-radius:4px;">Copy</button><div style="font-weight:600;">Best:</div><div id=ce-best style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px;">${sels.best}</div></div>`;
      if (sels.all.length > 1) {
        html += '<div style="margin-top:6px;font-weight:600">Alternatives:</div>';
        html += '<div style="margin-top:4px">' + sels.all.map((s, i) => `<div class="ce-alt" data-idx="${i}" style="cursor:pointer;padding:2px 0;color:#9cf">${s}</div>`).join("") + "</div>";
      }
      tip.innerHTML = html;
      tip.style.display = "block";
      const copyBtn = tip.querySelector("#ce-copy");
      if (copyBtn) {
        copyBtn.onclick = (ev) => {
          ev.stopPropagation();
          try {
            navigator.clipboard.writeText(sels.best);
          } catch (e) {
            console.warn("copy failed", e);
          }
        };
      }
      tip.querySelectorAll(".ce-alt").forEach((el) => {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const idx = Number(ev.currentTarget.getAttribute("data-idx")) || 0;
          const chosen = sels.all[idx] || sels.best;
          callback(chosen);
          disable();
        });
      });
      if (typeof clientX === "number" && typeof clientY === "number") {
        const tx = clientX + 12;
        let ty = clientY + 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tipRect = tip.getBoundingClientRect();
        if (tx + tipRect.width > vw)
          tip.style.left = `${Math.max(8, vw - tipRect.width - 8)}px`;
        else
          tip.style.left = `${tx}px`;
        if (ty + tipRect.height > vh)
          tip.style.top = `${Math.max(8, vh - tipRect.height - 8)}px`;
        else
          tip.style.top = `${ty}px`;
      } else {
        tip.style.left = `${Math.max(8, r.left)}px`;
        tip.style.top = `${Math.max(8, r.top - 8)}px`;
      }
    }
    function onMove(e) {
      e.stopPropagation();
      if (debounceTimer)
        clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const t = e.target;
        if (t !== current) {
          current = t;
          updateOverlayFor(current, e.clientX, e.clientY);
        }
      }, 50);
    }
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      if (current) {
        const sel = computeSelectors(current).best;
        callback(sel);
      }
      disable();
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        disable();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (current) {
          const sel = computeSelectors(current).best;
          callback(sel);
        }
        disable();
      }
    }
    function disable() {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      if (overlay.parentElement)
        overlay.parentElement.removeChild(overlay);
      if (tip.parentElement)
        tip.parentElement.removeChild(tip);
      if (debounceTimer)
        clearTimeout(debounceTimer);
    }
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return disable;
  }

  // src/background/content/extractor.ts
  function extract(info) {
    const result = {};
    const mappings = window.__EXT_CONFIG?.mappings || [];
    if (mappings.length === 0) {
      const titleEl = select("title");
      return {
        title: titleEl ? titleEl.textContent : null,
        url: typeof window !== "undefined" ? window.location.href : null
      };
    }
    let baseElement = null;
    if (info && info.srcElementId) {
      baseElement = document.getElementById(info.srcElementId) || null;
    } else if (info && info.menuItemId && window.getSelection) {
      const sel = window.getSelection();
      baseElement = sel && sel.anchorNode ? sel.anchorNode.parentElement : null;
    }
    for (const m of mappings) {
      try {
        let el = null;
        if (m.selectorA) {
          if (baseElement && (m.selectorA.startsWith(".") || m.selectorA.startsWith("[") || m.selectorA.startsWith(":"))) {
            el = baseElement.querySelector(m.selectorA);
          } else {
            el = document.querySelector(m.selectorA);
          }
        }
        if (el) {
          if (el.value !== void 0) {
            result[m.fieldA] = el.value;
          } else {
            result[m.fieldA] = el.textContent?.trim() ?? "";
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

  // src/background/content/content.ts
  console.log("content script initialized");
  chrome.storage.local.get(["config"], (res) => {
    const config = res.config || {};
    tryAutoLogin(config);
  });
  chrome.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "captureForSend") {
      const data = extract(msg.info);
      chrome.storage.local.set({ lastExtract: data }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg?.type === "fillFromLast" || msg?.type === "tryAutoFillOnLoad") {
      chrome.storage.local.get(["lastExtract", "config"], (res) => {
        const last = res.lastExtract || {};
        const config = res.config || {};
        tryFillFromData(last, config);
      });
    }
    if (msg?.type === "startVisualSelect") {
      const role = msg.role || "A";
      const disable = enableVisualSelector((selector) => {
        chrome.runtime.sendMessage({ type: "visualSelectorResult", selector, role });
        if (disable)
          disable();
      });
    }
  });
  function tryFillFromData(data, config) {
    if (!data || !config || !config.mappings)
      return;
    const urlMatches = !config.pageBUrl || location.href.includes(config.pageBUrl);
    if (!urlMatches)
      return;
    for (const map of config.mappings) {
      try {
        const targetEl = document.querySelector(map.selectorB);
        if (targetEl) {
          targetEl.value = data[map.fieldA] ?? "";
          targetEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } catch (e) {
      }
    }
  }
  function tryAutoLogin(config) {
    if (!config)
      return;
    const href = location.href;
    if (config.pageALoginUrl && config.autoLoginA && href.includes(config.pageALoginUrl)) {
      doAutoLogin(config, "A");
    }
    if (config.pageBLoginUrl && config.autoLoginB && href.includes(config.pageBLoginUrl)) {
      doAutoLogin(config, "B");
    }
  }
  function doAutoLogin(config, role) {
    const loginConfig = role === "A" ? config.pageALogin || {} : config.pageBLogin || {};
    if (!loginConfig)
      return;
    if (config.credentialType === "certificate") {
      if (loginConfig.certificateSelector && config.certificate) {
        const certEl = document.querySelector(loginConfig.certificateSelector);
        if (certEl) {
          certEl.value = config.certificate;
          certEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } else {
      if (loginConfig.usernameSelector && config.username) {
        const userEl = document.querySelector(loginConfig.usernameSelector);
        if (userEl) {
          userEl.value = config.username;
          userEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      if (loginConfig.passwordSelector && config.password) {
        const passEl = document.querySelector(loginConfig.passwordSelector);
        if (passEl) {
          passEl.value = config.password;
          passEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    }
    if (loginConfig.submitSelector) {
      const submitEl = document.querySelector(loginConfig.submitSelector);
      if (submitEl) {
        submitEl.click();
      }
    }
  }
})();
