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


function getTxHistoryKey() {
    const currentRPC = localStorage.getItem("rpc") || "https://node.xian.org";
   
    const rpcHash = btoa(currentRPC).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    return `tx_history_${rpcHash}`;
}

function loadRPCSpecificTxHistory() {
    const key = getTxHistoryKey();
    let rpcSpecificHistory = JSON.parse(localStorage.getItem(key)) || [];
    
      if (rpcSpecificHistory.length === 0) {
        const oldHistory = JSON.parse(localStorage.getItem('tx_history')) || [];
        if (oldHistory.length > 0) {
            console.log('Migrating', oldHistory.length, 'transactions from old storage to RPC-specific storage');
            localStorage.setItem(key, JSON.stringify(oldHistory));
            rpcSpecificHistory = oldHistory;
        }
    }
    return rpcSpecificHistory;
}




// Helper function to save RPC-specific transaction history
function saveRPCSpecificTxHistory(transactions) {
    const key = getTxHistoryKey();
    localStorage.setItem(key, JSON.stringify(transactions));
}

function prependToTransactionHistory(hash, contract, function_name, kwargs, status, timestamp) {

    tx_history = loadRPCSpecificTxHistory();
    
    tx_history.unshift({
        hash: hash,
        contract: contract,
        function: function_name,
        kwargs: kwargs,
        status: status,
        timestamp: timestamp
    });
    
   
    saveRPCSpecificTxHistory(tx_history);
}