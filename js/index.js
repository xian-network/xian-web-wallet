document.getElementById('side-change-page-settings').addEventListener('click', function() {
    changePage('settings');
});

document.getElementById('side-change-page-ide').addEventListener('click', function() {
    changePage('ide');
});

document.getElementById('side-change-page-wallet').addEventListener('click', function() {
    changePage('wallet');
});

document.getElementById('side-lock-wallet').addEventListener('click', function() {
    lockWallet();
});

document.getElementById('side-change-page-govenance').addEventListener('click', function() {
    changePage('governance');
});

function lockWallet() {
    let confirm_lock = confirm("Are you sure you want to lock the wallet?");
    if (!confirm_lock) {
        return;
    }
    // Locks the wallet
    unencryptedPrivateKey = null;
    locked = true;
    changePage('password-input');
}