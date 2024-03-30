document.getElementById('btn-password-input-unlock-wallet').addEventListener('click', function() {
    unlockWallet();
});
document.getElementById('btn-password-input-remove-wallet').addEventListener('click', function() {
    removeWallet();
});

document.getElementById('unlock_password').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        unlockWallet();
    }
});