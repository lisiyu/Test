function el(id: string) { return document.getElementById(id) as HTMLInputElement; }

function renderMappings(mappings: any[]) {
  const container = document.getElementById('mappings')!;
  container.innerHTML = '';
  mappings.forEach((m, idx) => {
    const row = document.createElement('div');
    row.innerHTML = `
      <input data-idx="${idx}" class="fieldA" placeholder="fieldA" value="${m.fieldA || ''}" />
      <input data-idx="${idx}" class="selectorA" placeholder="selectorA" value="${m.selectorA || ''}" />
      =>
      <input data-idx="${idx}" class="selectorB" placeholder="selectorB" value="${m.selectorB || ''}" />
      <button class="rm" data-idx="${idx}">x</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.rm').forEach(b => {
    b.addEventListener('click', (ev) => {
      const idx = Number((ev.target as HTMLElement).getAttribute('data-idx'));
      mappings.splice(idx,1);
      renderMappings(mappings);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save')!;
  const addBtn = document.getElementById('addMapping')!;

  chrome.storage.local.get(['config'], (res) => {
    const config = res.config || { mappings: [] };
    (el('pageA')).value = config.pageAUrl || '';
    (el('pageB')).value = config.pageBUrl || '';
    (el('loginUrl')).value = config.loginUrl || '';
    (el('username')).value = config.username || '';
    (el('password')).value = config.password || '';
    renderMappings(config.mappings || []);
  });

  addBtn.addEventListener('click', () => {
    chrome.storage.local.get(['config'], (res) => {
      const config = res.config || { mappings: [] };
      config.mappings = config.mappings || [];
      config.mappings.push({ fieldA: '', selectorA: '', selectorB: '' });
      chrome.storage.local.set({ config }, () => renderMappings(config.mappings));
    });
  });

  saveBtn.addEventListener('click', () => {
    const mappings: any[] = [];
    document.querySelectorAll('#mappings > div').forEach((d) => {
      const fieldA = (d.querySelector('.fieldA') as HTMLInputElement).value;
      const selectorA = (d.querySelector('.selectorA') as HTMLInputElement).value;
      const selectorB = (d.querySelector('.selectorB') as HTMLInputElement).value;
      if (fieldA && selectorA && selectorB) mappings.push({ fieldA, selectorA, selectorB });
    });

    const config = {
      pageAUrl: (el('pageA')).value,
      pageBUrl: (el('pageB')).value,
      loginUrl: (el('loginUrl')).value,
      username: (el('username')).value,
      password: (el('password')).value,
      mappings,
    };
    chrome.storage.local.set({ config }, () => {
      alert('Saved');
      // expose to window for content scripts fallback
      (window as any).__EXT_CONFIG = config;
    });
  });
});
