document.getElementById('wallet-change-page-settings').addEventListener('click', function() {
    changePage('settings');
});

document.getElementById('wallet-change-page-ide').addEventListener('click', function() {
    changePage('ide');
});

document.getElementById('wallet-tokens-tab').addEventListener('click', function() {
    changeWalletTab('wallet-tokens');
});

document.getElementById('local-activity-tab').addEventListener('click', function() {
    changeWalletTab('local-activity');
});

document.getElementById('wallet-clear-local-activity').addEventListener('click', function() {
    clearLocalActivity();
});

document.getElementById('wallet-refresh-all').addEventListener('click', function() {
    loadWalletPage();
});

document.getElementById('walletAddress').addEventListener('click', function() {
    copyToClipboard('walletAddress');
});