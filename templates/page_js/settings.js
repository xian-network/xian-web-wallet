document.getElementById('settings-back').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('private_key_export').addEventListener('click', function() {
    exportPrivateKey();
});

document.getElementById('remove_wallet_export').addEventListener('click', function() {
    removeWallet();
});

document.getElementById('settings-save-settings').addEventListener('click', function() {
    saveSettings();
});