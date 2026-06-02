function el(id: string) { return document.getElementById(id) as HTMLInputElement; }

function renderMappings(mappings: any[]) {
  const container = document.getElementById('mappings')!;
  container.innerHTML = '';
  mappings.forEach((m, idx) => {
    const row = document.createElement('div');
    row.innerHTML = `
      <input data-idx="${idx}" class="fieldA" placeholder="fieldA" value="${m.fieldA || ''}" />
      <input data-idx="${idx}" class="selectorA" placeholder="selectorA" value="${m.selectorA || ''}" />
      <button data-idx="${idx}" class="pickA">Pick A</button>
      =>
      <input data-idx="${idx}" class="selectorB" placeholder="selectorB" value="${m.selectorB || ''}" />
      <button data-idx="${idx}" class="pickB">Pick B</button>
      API field: <input data-idx="${idx}" class="apiField" placeholder="apiField" value="${m.apiField || ''}" />
      <button class="rm" data-idx="${idx}">x</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.rm').forEach(b => {
    b.addEventListener('click', (ev) => {
      const idx = Number((ev.target as HTMLElement).getAttribute('data-idx'));
      mappings.splice(idx, 1);
      renderMappings(mappings);
    });
  });

  container.querySelectorAll('.pickA').forEach(b => {
    b.addEventListener('click', (ev) => {
      const idx = Number((ev.target as HTMLElement).getAttribute('data-idx'));
      startVisualPick(idx, 'A');
    });
  });

  container.querySelectorAll('.pickB').forEach(b => {
    b.addEventListener('click', (ev) => {
      const idx = Number((ev.target as HTMLElement).getAttribute('data-idx'));
      startVisualPick(idx, 'B');
    });
  });
}

function toggleTargetSettings() {
  const t = (document.getElementById('pageBTargetType') as HTMLSelectElement).value;
  const api = document.getElementById('apiSettings') as HTMLElement;
  const pageB = document.getElementById('pageBSettings') as HTMLElement;
  api.style.display = t === 'api' ? 'block' : 'none';
  pageB.style.display = t === 'api' ? 'none' : 'block';
}

function toggleCredentialSection() {
  const type = (document.getElementById('credentialType') as HTMLSelectElement).value;
  const passwordSection = document.getElementById('passwordCredentials') as HTMLElement;
  const certificateSection = document.getElementById('certificateCredentials') as HTMLElement;
  if (type === 'certificate') {
    passwordSection.style.display = 'none';
    certificateSection.style.display = 'block';
  } else {
    passwordSection.style.display = 'block';
    certificateSection.style.display = 'none';
  }
}

function startVisualPick(idx: number, role: 'A'|'B') {
  chrome.storage.local.get(['config'], (res) => {
    const config = res.config || {};
    const pageUrl = role === 'A' ? config.pageAUrl : config.pageBUrl;
    chrome.storage.local.set({ pendingSelection: { idx, role } }, () => {
      if (!pageUrl) {
        alert('No page URL configured for that role');
        return;
      }
      chrome.tabs.query({ url: pageUrl + '*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const tab = tabs[0];
          chrome.tabs.update(tab.id!, { active: true }, () => {
            setTimeout(() => chrome.tabs.sendMessage(tab.id!, { type: 'startVisualSelect', role }), 400);
          });
        } else {
          chrome.tabs.create({ url: pageUrl }, (tab) => {
            setTimeout(() => chrome.tabs.sendMessage(tab.id!, { type: 'startVisualSelect', role }), 600);
          });
        }
      });
    });
  });
}

chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg?.type === 'visualSelectorResult') {
    chrome.storage.local.get(['pendingSelection', 'config'], (res) => {
      const pending = res.pendingSelection;
      const config = res.config || { mappings: [] };
      if (!pending) return;
      const idx = Number(pending.idx);
      const role = pending.role;
      config.mappings = config.mappings || [];
      config.mappings[idx] = config.mappings[idx] || { fieldA: '', selectorA: '', selectorB: '', apiField: '' };
      if (role === 'A') config.mappings[idx].selectorA = msg.selector;
      else config.mappings[idx].selectorB = msg.selector;
      chrome.storage.local.set({ config, pendingSelection: null }, () => {
        renderMappings(config.mappings);
      });
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save')!;
  const addBtn = document.getElementById('addMapping')!;
  const pageBTargetType = document.getElementById('pageBTargetType') as HTMLSelectElement;
  pageBTargetType.addEventListener('change', toggleTargetSettings);
  const credentialType = document.getElementById('credentialType') as HTMLSelectElement;
  credentialType.addEventListener('change', toggleCredentialSection);

chrome.storage.local.get(['config', 'lastApiResult', 'lastApiError'], (res) => {
      const config = res.config || { mappings: [] };
      (el('pageA')).value = config.pageAUrl || '';
      (el('pageALoginUrl')).value = config.pageALoginUrl || '';
      (document.getElementById('autoLoginA') as HTMLInputElement).checked = !!config.autoLoginA;
      (el('pageAUsernameSelector')).value = config.pageALogin?.usernameSelector || '';
      (el('pageAPasswordSelector')).value = config.pageALogin?.passwordSelector || '';
      (el('pageASubmitSelector')).value = config.pageALogin?.submitSelector || '';
      (el('pageB')).value = config.pageBUrl || '';
      (document.getElementById('pageBTargetType') as HTMLSelectElement).value = config.pageBTargetType || 'web';
      (el('apiUrl')).value = config.apiUrl || '';
      (document.getElementById('apiMethod') as HTMLSelectElement).value = config.apiMethod || 'POST';
      (document.getElementById('apiHeaders') as HTMLTextAreaElement).value = config.apiHeaders || '';
      (el('pageBLoginUrl')).value = config.pageBLoginUrl || '';
      (document.getElementById('autoLoginB') as HTMLInputElement).checked = !!config.autoLoginB;
      (el('pageBUsernameSelector')).value = config.pageBLogin?.usernameSelector || '';
      (el('pageBPasswordSelector')).value = config.pageBLogin?.passwordSelector || '';
      (el('pageBSubmitSelector')).value = config.pageBLogin?.submitSelector || '';
      (document.getElementById('credentialType') as HTMLSelectElement).value = config.credentialType || 'password';
      (el('username')).value = config.username || '';
      (el('password')).value = config.password || '';
      (document.getElementById('certificate') as HTMLInputElement).value = config.certificate || '';
      toggleCredentialSection();
      toggleTargetSettings();
      renderMappings(config.mappings || []);
      renderApiStatus(res.lastApiResult, res.lastApiError);
  });

  addBtn.addEventListener('click', () => {
    chrome.storage.local.get(['config'], (res) => {
      const config = res.config || { mappings: [] };
      config.mappings = config.mappings || [];
      config.mappings.push({ fieldA: '', selectorA: '', selectorB: '', apiField: '' });
      chrome.storage.local.set({ config }, () => renderMappings(config.mappings));
    });
  });

  saveBtn.addEventListener('click', () => {
    const mappings: any[] = [];
    // validate apiHeaders JSON early and show inline error
    const apiHeadersEl = document.getElementById('apiHeaders') as HTMLTextAreaElement;
    const apiHeadersError = document.getElementById('apiHeadersError') as HTMLElement;
    apiHeadersError.style.display = 'none';
    const apiHeadersText = apiHeadersEl.value;
    if (apiHeadersText && apiHeadersText.trim()) {
      try { JSON.parse(apiHeadersText); } catch (e: any) { apiHeadersError.textContent = 'apiHeaders is not valid JSON: ' + (e?.message || String(e)); apiHeadersError.style.display = 'block'; return; }
    }
    document.querySelectorAll('#mappings > div').forEach((d) => {
      const fieldA = (d.querySelector('.fieldA') as HTMLInputElement).value;
      const selectorA = (d.querySelector('.selectorA') as HTMLInputElement).value;
      const selectorB = (d.querySelector('.selectorB') as HTMLInputElement).value;
      const apiField = (d.querySelector('.apiField') as HTMLInputElement).value;
      if (fieldA && selectorA && selectorB) mappings.push({ fieldA, selectorA, selectorB, apiField });
    });

    const config = {
      pageAUrl: (el('pageA')).value,
      pageALoginUrl: (el('pageALoginUrl')).value,
      autoLoginA: (document.getElementById('autoLoginA') as HTMLInputElement).checked,
      pageALogin: {
        usernameSelector: (el('pageAUsernameSelector')).value,
        passwordSelector: (el('pageAPasswordSelector')).value,
        submitSelector: (el('pageASubmitSelector')).value,
      },
      pageBUrl: (el('pageB')).value,
      pageBTargetType: (document.getElementById('pageBTargetType') as HTMLSelectElement).value,
      apiUrl: (el('apiUrl')).value,
      apiMethod: (document.getElementById('apiMethod') as HTMLSelectElement).value,
      apiHeaders: (document.getElementById('apiHeaders') as HTMLTextAreaElement).value,
      pageBLoginUrl: (el('pageBLoginUrl')).value,
      autoLoginB: (document.getElementById('autoLoginB') as HTMLInputElement).checked,
      pageBLogin: {
        usernameSelector: (el('pageBUsernameSelector')).value,
        passwordSelector: (el('pageBPasswordSelector')).value,
        submitSelector: (el('pageBSubmitSelector')).value,
      },
      credentialType: (document.getElementById('credentialType') as HTMLSelectElement).value,
      username: (el('username')).value,
      password: (el('password')).value,
      certificate: (document.getElementById('certificate') as HTMLInputElement).value,
      mappings,
    };
    chrome.storage.local.set({ config }, () => {
      alert('Saved');
      (window as any).__EXT_CONFIG = config;
    });
  });

  function renderApiStatus(lastApiResult: any, lastApiError: string | null) {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    if (lastApiError) {
      statusEl.textContent = `Last API error:\n${lastApiError}`;
      return;
    }
    if (!lastApiResult) {
      statusEl.textContent = 'No API request recorded yet.';
      return;
    }
    statusEl.textContent = `Last API response:\nStatus: ${lastApiResult.status} ${lastApiResult.statusText}\nBody:\n${lastApiResult.body}`;
  }
});
