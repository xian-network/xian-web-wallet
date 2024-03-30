var editor = CodeMirror(document.querySelector('#editor'), {
    value: "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'",
    mode:  "python",
});

// Get current stamp rate
document.getElementById("stampRate").innerHTML = getStampRate();

document.getElementById('btn-ide-submit-contract').addEventListener('click', function() {
    submitContract();
});
document.getElementById('btn-ide-go-to-wallet').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('ide-send-adv-tx').addEventListener('click', function() {
    changePage('send-advanced-transaction');
});