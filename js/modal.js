(() => {
  function showAlertModal(message, title = 'Notice') {
    const root = document.getElementById('modalRoot');
    const dialog = root && root.querySelector('.x-modal-dialog');
    const msgEl = document.getElementById('modalMessage');
    const titleEl = document.getElementById('modalTitle');
    const okBtn = document.getElementById('modalOkBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const overlay = document.getElementById('modalOverlay');
    if (!root || !dialog || !msgEl || !titleEl || !okBtn || !overlay) return window.alert(message);

    titleEl.textContent = String(title);
    msgEl.textContent = String(message);
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const close = () => {
      root.classList.add('hidden');
      document.body.style.overflow = '';
      okBtn.removeEventListener('click', onOk);
      cancelBtn && cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOk);
      document.removeEventListener('keydown', onKey);
    };
    const onOk = () => close();
    const onCancel = () => close();
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };

    okBtn.addEventListener('click', onOk);
    cancelBtn && cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOk);
    document.addEventListener('keydown', onKey);
    okBtn.focus();
  }

  // Override window.alert globally
  const originalAlert = window.alert;
  window.alert = function(message) { showAlertModal(message); };

  // Provide a confirm-style modal returning a Promise<boolean>
  window.showConfirmModal = function(message, title = 'Confirm'){
    const root = document.getElementById('modalRoot');
    const msgEl = document.getElementById('modalMessage');
    const titleEl = document.getElementById('modalTitle');
    const okBtn = document.getElementById('modalOkBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const overlay = document.getElementById('modalOverlay');
    if (!root || !msgEl || !titleEl || !okBtn || !cancelBtn || !overlay) return Promise.resolve(confirm(message));
    titleEl.textContent = String(title);
    msgEl.textContent = String(message);
    cancelBtn.style.display = '';
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    return new Promise((resolve) => {
      const cleanup = () => {
        cancelBtn.style.display = 'none';
        root.classList.add('hidden');
        document.body.style.overflow = '';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
      };
      const onOk = () => { resolve(true); cleanup(); };
      const onCancel = () => { resolve(false); cleanup(); };
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onOk(); };
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey);
      okBtn.focus();
    });
  }

  // Optional export
  window.showAlertModal = showAlertModal;
})();


