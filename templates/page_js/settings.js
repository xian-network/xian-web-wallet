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

function loadSettingsPage() {
    document.getElementById('rpc_input').value = RPC;
    document.getElementById('chain_id_input').value = CHAIN_ID;
}

loadSettingsPage();