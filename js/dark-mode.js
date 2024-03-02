document.addEventListener('DOMContentLoaded', (event) => {
    const toggler = document.getElementById('darkModeToggler');
    const body = document.body;
    
    function updateTogglerUI() {
        if (body.classList.contains('dark-mode')) {
            toggler.innerHTML = '<i class="fas fa-sun"></i>';
            toggler.classList.replace('btn-light', 'btn-dark');
        } else {
            toggler.innerHTML = '<i class="fas fa-moon"></i>';
            toggler.classList.replace('btn-dark', 'btn-light');
        }
    }

    // By default, enable dark mode
    body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');
    updateTogglerUI();

    toggler.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        updateTogglerUI();
    });
});