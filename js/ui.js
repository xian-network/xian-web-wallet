function copyToClipboard(elementId) {
    let element = document.getElementById(elementId);
    // span
    let range, selection;
    if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    document.execCommand('copy');
    alert('Copied to clipboard');
}

function copyTextToClipboard(text) {
    let element = document.createElement('textarea');
    element.value = text;
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
    alert('Copied to clipboard');
}

function goToWallet() {
    Promise.all([
        readSecureCookie('publicKey'),
        readSecureCookie('encryptedPrivateKey')
    ]).then((values) => {
        if( values[0] === null || values[1] === null) {
            changePage('get-started');
        } else {
            changePage('wallet');
        }
    });
}

function prependToTransactionHistory(hash, contract, function_name, kwargs, status, timestamp) {
    tx_history.unshift({
        hash: hash,
        contract: contract,
        function: function_name,
        kwargs: kwargs,
        status: status,
        timestamp: timestamp
    });
    localStorage.setItem('tx_history', JSON.stringify(tx_history));
}