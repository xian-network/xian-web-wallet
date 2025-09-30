document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Navbar actions
  // Navbar dropdown
  const navMenuBtn = document.getElementById('navMenuBtn');
  const navMenu = document.getElementById('navMenu');
  const privacyBadge = document.getElementById('privacyBadge');
  const privacySwitch = document.getElementById('privacySwitch');
  const privacyIndicator = document.getElementById('privacyIndicator');


  function handleNavAction(action){
    if (locked) {
      toast && toast('warning', 'Wallet is locked');
      return;
    }
    if (action === 'send') return changePage('send-token');
    if (action === 'receive') return changePage('receive-token');
    if (action === 'refresh') return changePage(app_page);
    if (action === 'command') return toggleCmdk();
    if (action === 'qr') return showQRModal();
    if (action === 'privacy') return togglePrivacyMode();
    if (action === 'copy') {
      (async () => {
        try {
          const addrEl = document.getElementById('walletAddress') || document.getElementById('yourAddressReceive');
          const text = (addrEl && addrEl.innerText) || (window.publicKey || '');
          if (!text) return;
          await navigator.clipboard.writeText(text);
          toast && toast('success', 'Address copied');
        } catch (e){ console.warn(e); }
      })();
    }
  }

  if (navMenuBtn && navMenu){
    navMenuBtn.addEventListener('click', () => navMenu.classList.toggle('hidden'));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-dropdown')) navMenu.classList.add('hidden');
    });
    navMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const action = item.getAttribute('data-action');
      navMenu.classList.add('hidden');
      handleNavAction(action);
    });
  }

  // QR Modal (receive)
  function showQRModal(){
    const root = document.getElementById('qrModalRoot');
    const overlay = document.getElementById('qrModalOverlay');
    const closeBtn = document.getElementById('qrCloseBtn');
    const container = document.getElementById('qrContainer');
    const addrEl = document.getElementById('walletAddress');
    const address = (addrEl && addrEl.innerText) || window.publicKey || '';
    const out = document.getElementById('qrAddress');
    if (!root || !overlay || !closeBtn || !container) return;
    container.innerHTML = '';
    try {
      if (window.QRCode) {
        new QRCode(container, {
          text: address,
          width: 192,
          height: 192,
          colorDark : "#e8fefe",
          colorLight : "#0b1716",
          correctLevel : QRCode.CorrectLevel.M
        });
      } else {
        container.textContent = 'QR library not loaded';
      }
    } catch(e) {
      container.textContent = 'QR generation error';
    }
    if (out) out.textContent = address;
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const close = () => { root.classList.add('hidden'); document.body.style.overflow = ''; };
    overlay.addEventListener('click', close, { once:true });
    closeBtn.addEventListener('click', close, { once:true });
  }

  // Privacy Mode: blur sensitive values
  function applyPrivacyMode(on){
    try { localStorage.setItem('privacyMode', on ? 'true' : 'false'); } catch(e) {}
    if (privacyBadge) privacyBadge.textContent = on ? 'On' : 'Off';
    if (privacySwitch) privacySwitch.checked = !!on;
    if (privacyIndicator) privacyIndicator.classList.toggle('hidden', !on);
    document.documentElement.classList.toggle('privacy-mode', !!on);
    const sensitiveSelectors = [
      '#walletAddress', '#yourAddressReceive', '.token-balance', '.messenger-inbox-item-content p'
    ];
    sensitiveSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (on) el.classList.add('privacy-blur'); else el.classList.remove('privacy-blur');
      });
    });
  }
  function togglePrivacyMode(){
    const on = (localStorage.getItem('privacyMode') === 'true') ? false : true;
    applyPrivacyMode(on);
  }
  applyPrivacyMode(localStorage.getItem('privacyMode') === 'true');

  if (privacySwitch) {
    privacySwitch.addEventListener('change', (e) => {
      applyPrivacyMode(!!e.target.checked);
    });
  }



  // Floating Action Button
  const fabMain = $('#fabMain');
  const fabMenu = $('#fabMenu');
  if (fabMain && fabMenu) {
    fabMain.addEventListener('click', () => {
      fabMenu.classList.toggle('hidden');
    });
    fabMenu.addEventListener('click', (e) => {
      const target = e.target.closest('.fab-item');
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (action === 'send') changePage('send-token');
      if (action === 'receive') changePage('receive-token');
      if (action === 'add-token') changePage('add-to-token-list');
      if (action === 'advanced') changePage('send-advanced-transaction');
      fabMenu.classList.add('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fab')) fabMenu.classList.add('hidden');
    });
  }

  // Command Palette
  const cmdk = $('#cmdk');
  const cmdkInput = $('#cmdkInput');
  const cmdkList = $('#cmdkList');

  function getCommands() {
    return [
      { id: 'wallet', label: 'Go to Wallet', action: () => changePage('wallet') },
      { id: 'send', label: 'Send Token', action: () => changePage('send-token') },
      { id: 'receive', label: 'Receive Token', action: () => changePage('receive-token') },
      { id: 'addtoken', label: 'Add to Token List', action: () => changePage('add-to-token-list') },
      { id: 'advanced', label: 'Advanced Transaction', action: () => changePage('send-advanced-transaction') },
      { id: 'messenger', label: 'Open Messenger', action: () => changePage('messenger') },
      { id: 'ide', label: 'Open IDE', action: () => changePage('ide') },
      { id: 'settings', label: 'Open Settings', action: () => changePage('settings') },
      { id: 'news', label: 'Chain News', action: () => changePage('ecosystem-news') },
      { id: 'refresh', label: 'Refresh Current Page', action: () => changePage(app_page) },
    ];
  }

  function renderCommands(filter = '') {
    if (!cmdkList) return;
    const items = getCommands().filter(c => c.label.toLowerCase().includes(filter.toLowerCase()));
    cmdkList.innerHTML = '';
    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.textContent = item.label;
      li.setAttribute('data-id', item.id);
      if (idx === 0) li.setAttribute('aria-selected', 'true');
      li.addEventListener('click', () => { item.action(); hideCmdk(); });
      cmdkList.appendChild(li);
    });
  }

  function showCmdk() {
    if (!cmdk) return;
    cmdk.classList.remove('hidden');
    renderCommands('');
    setTimeout(() => cmdkInput && cmdkInput.focus(), 0);
    document.body.style.overflow = 'hidden';
  }
  function hideCmdk() {
    if (!cmdk) return;
    cmdk.classList.add('hidden');
    document.body.style.overflow = '';
  }
  function toggleCmdk() { (cmdk && cmdk.classList.contains('hidden')) ? showCmdk() : hideCmdk(); }

  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const tag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
    const isTyping = !!(e.target && (e.target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target.closest && e.target.closest('[contenteditable="true"]'))));
    if (isTyping) return;
    if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      toggleCmdk();
    }
    // Quick nav: g then key
    if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'g') {
      window.__x_hotkey_g__ = true;
      setTimeout(() => { window.__x_hotkey_g__ = false; }, 800);
      return;
    }
    if (window.__x_hotkey_g__) {
      const k = e.key.toLowerCase();
      if (k === 'w') { e.preventDefault(); changePage('wallet'); window.__x_hotkey_g__ = false; }
      if (k === 's') { e.preventDefault(); changePage('send-token'); window.__x_hotkey_g__ = false; }
      if (k === 'r') { e.preventDefault(); changePage('receive-token'); window.__x_hotkey_g__ = false; }
      if (k === 'i') { e.preventDefault(); changePage('ide'); window.__x_hotkey_g__ = false; }
      if (k === 'm') { e.preventDefault(); changePage('messenger'); window.__x_hotkey_g__ = false; }
      if (k === 'n') { e.preventDefault(); changePage('ecosystem-news'); window.__x_hotkey_g__ = false; }
      if (k === 'a') { e.preventDefault(); changePage('add-to-token-list'); window.__x_hotkey_g__ = false; }
      if (k === 'x') { e.preventDefault(); changePage('send-advanced-transaction'); window.__x_hotkey_g__ = false; }
    }
    if (e.key === 'Escape' && cmdk && !cmdk.classList.contains('hidden')) {
      hideCmdk();
    }
    if (cmdk && !cmdk.classList.contains('hidden')) {
      const selected = cmdkList.querySelector('li[aria-selected="true"]');
      const items = $$('#cmdkList li');
      let index = items.indexOf(selected);
      if (e.key === 'ArrowDown') { e.preventDefault(); index = Math.min(items.length - 1, index + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); index = Math.max(0, index - 1); }
      if (e.key === 'Enter') { e.preventDefault(); if (selected) selected.click(); }
      items.forEach(li => li.removeAttribute('aria-selected'));
      if (items[index]) items[index].setAttribute('aria-selected', 'true');
    }
  });

  if (cmdkInput) cmdkInput.addEventListener('input', (e) => renderCommands(e.target.value));
});


