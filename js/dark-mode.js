document.addEventListener('DOMContentLoaded', (event) => {
    const toggler = document.getElementById('darkModeToggler');
    const body = document.body;
    
    function updateTogglerUI() {}

    body.classList.add('dark-mode');
    try { localStorage.setItem('darkMode', 'true'); } catch(e) {}

    // No-op: dark mode is enforced
});