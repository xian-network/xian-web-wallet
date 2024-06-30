// Why do I even need to make this? Why do you need to have markup for every toast in bootstrap? Why can't I just call a function and pass in the type and message?

function toast(type, message) {
    // Types: primary, secondary, success, danger, warning, info, light, dark
    var toast = document.createElement('div');
    toast.classList.add('bg-' + type);
    let lightTypes = ['primary', 'secondary', 'info', 'light', 'warning'];
    if (lightTypes.includes(type)) {
        toast.classList.add('text-dark');
    }
    else {
        toast.classList.add('text-light');
    }

    toast.classList.add('toast');
    toast.classList.add('align-items-center');
    toast.classList.add('border-0');
    toast.classList.add('position-fixed');
    toast.classList.add('top-0');
    toast.classList.add('end-0');
    toast.classList.add('p-3');
    toast.classList.add('m-3');
    toast.style.zIndex = 9999;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = message;

    var dismissButton = document.createElement('button');
    dismissButton.classList.add('btn-close');
    dismissButton.setAttribute('type', 'button');
    dismissButton.setAttribute('data-bs-dismiss', 'toast');
    dismissButton.setAttribute('aria-label', 'Close');
    toast.appendChild(dismissButton);

    document.body.appendChild(toast);
    let bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        document.body.removeChild(toast);
    });
}



