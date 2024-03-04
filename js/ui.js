function createWallet() {
    let password = document.getElementById('password').value;

    let keyPair = createKeyPair(password);
    let publicKey = keyPair.publicKey;
    let encryptedPrivateKey = keyPair.encryptedPrivateKey;
    let _unencryptedPrivateKey = keyPair.unencryptedPrivateKey;
    
    // Save the public key and the encrypted private key
    createSecureCookie('publicKey', publicKey, 9999);
    createSecureCookie('encryptedPrivateKey', encryptedPrivateKey, 9999);

    // Save the unencrypted private key to the global variable
    unencryptedPrivateKey = _unencryptedPrivateKey;

    changePage('wallet');

}

function importWallet() {
    let password = document.getElementById('import_password').value;
    let confirmPassword = document.getElementById('import_confirmPassword').value;
    let privateKey = document.getElementById('import_privateKey').value;
    let importWalletError = document.getElementById('importWalletError');

    if (privateKey.length !== 64) {
        importWalletError.innerHTML = 'Invalid private key!';
        importWalletError.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        importWalletError.innerHTML = 'Password must be at least 6 characters long!';
        importWalletError.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        importWalletError.innerHTML = 'Passwords do not match!';
        importWalletError.style.display = 'block';
        return;
    }

    importWalletError.style.display = 'none';

    let keyPair = createKeyPairFromSK(privateKey, password);
    console.log(keyPair);
    let publicKey = keyPair.publicKey;
    let encryptedPrivateKey = keyPair.encryptedPrivateKey;
    let _unencryptedPrivateKey = keyPair.unencryptedPrivateKey;
    
    // Save the public key and the encrypted private key
    createSecureCookie('publicKey', publicKey, 9999);
    createSecureCookie('encryptedPrivateKey', encryptedPrivateKey, 9999);
    
    // Save the unencrypted private key to the global variable
    unencryptedPrivateKey = _unencryptedPrivateKey;

    changePage('wallet');
}

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

function removeWallet(){
    let confirm_delete = confirm("Are you sure you want to remove the wallet?");
    if (!confirm_delete) {
        return;
    }
    // Removes the wallet
    eraseSecureCookie('publicKey');
    eraseSecureCookie('encryptedPrivateKey');
    unencryptedPrivateKey = null;
    changePage('get-started');
}

function unlockWallet() {
    let password = document.getElementById('unlock_password').value;
    let encryptedPrivateKey = readSecureCookie('encryptedPrivateKey');
    let publicKey = readSecureCookie('publicKey');
    let _unencryptedPrivateKey = decryptPrivateKey(encryptedPrivateKey, password, publicKey);
    if (_unencryptedPrivateKey == null) {
        document.getElementById('passwordError').style.display = 'block';
        document.getElementById('passwordError').innerHTML = 'Incorrect password!';
        return;
    }
    document.getElementById('passwordError').style.display = 'none';

    unencryptedPrivateKey = _unencryptedPrivateKey;
    changePage('wallet');
}

function lockWallet() {
    unencryptedPrivateKey = null;
    changePage('password-input');
}

function goToWallet() {
    if (readSecureCookie('publicKey') === null || readSecureCookie('encryptedPrivateKey') === null) {
        changePage('get-started');
    } else {
        changePage('wallet');
    }
}

function loadSettingsPage() {
    document.getElementById('rpc_input').value = RPC;
    document.getElementById('chain_id_input').value = CHAIN_ID;
}

function saveSettings() {
    let settingsSuccess = document.getElementById('settingsSuccess');
    let settingsError = document.getElementById('settingsError');
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';

    let rpc = document.getElementById('rpc_input').value;
    let chain_id = document.getElementById('chain_id_input').value;

    if (rpc === "" || chain_id === "") {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'All fields are required!';
        return;
    }

    // rpc has to start with https and not end with a slash
    if (!rpc.startsWith('https://')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must start with https://';
        return;
    }

    if (rpc.endsWith('/')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must not end with a slash';
        return;
    }


    localStorage.setItem("rpc", rpc);
    localStorage.setItem("chain_id", chain_id);
    RPC = rpc;
    CHAIN_ID = chain_id;


    settingsSuccess.style.display = 'block';
    settingsSuccess.innerHTML = 'Settings saved successfully!';
    
}

function sendTokenScreen() {
    changePage('send-token');
}

function receiveTokenScreen() {
    changePage('receive-token');
}

function refreshBalance(contract) {
    let balance = getVariable(contract, "balances", readSecureCookie('publicKey'));
    if (balance === null) {
        balance = "0";
    }
    balance = parseFloat(balance);
    balance = balance.toFixed(8);
    document.getElementById(contract+'Balance').innerHTML = balance;
}

function sendToken(contract) {
    let recipient = document.getElementById('toAddress').value;
    let amount = document.getElementById('tokenAmount').value;
    let successMsg = document.getElementById('sendTokenSuccess');
    let errorMsg = document.getElementById('sendTokenError');
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    if (recipient.length !== 64) {
        errorMsg.innerHTML = 'Invalid recipient address!';
        errorMsg.style.display = 'block';
        return;
    }

    // Check if there is a comma in the amount
    if (amount.includes(',')) {
        errorMsg.innerHTML = 'Commas are not allowed! Decimals should be separated by a dot.';
        errorMsg.style.display = 'block';
        return;
    }

    // Turn the amount into a float 
    amount = parseFloat(amount);

    if (amount <= 0) {
        errorMsg.innerHTML = 'Invalid amount!';
        errorMsg.style.display = 'block';
        return;
    }

    if (amount > parseFloat(getVariable(contract, "balances", readSecureCookie('publicKey')))) {
        errorMsg.innerHTML = 'Insufficient balance!';
        errorMsg.style.display = 'block';
        return;
    }

    if (recipient.substring(0, 2) === '0x') {
        errorMsg.innerHTML = 'Incompatible recipient address!';
        errorMsg.style.display = 'block';
        return;
    }

    let transaction = {
        chain_id: CHAIN_ID,
        contract: contract,
        function: "transfer",
        kwargs: {
            recipient: recipient,
            amount: amount
        },
        stamps_supplied: 100
    };

    let signed_tx = signTransaction(transaction, unencryptedPrivateKey);
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];

    if (response['result']['check_tx']['code'] == 1) {
        errorMsg.innerHTML = 'Transaction failed! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/"+hash+"' target='_blank'>"+hash+"</a>"
        errorMsg.style.display = 'block';
        return;
    }

    if (response['result']['deliver_tx']['code'] == 1) {
        errorMsg.innerHTML = 'Transaction failed! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/"+hash+"' target='_blank'>"+hash+"</a>"
        errorMsg.style.display = 'block';
        return;
    }

    data = atob(response['result']['deliver_tx']['data']);
    data = JSON.parse(data);

    if (data['status'] == 1) {
        errorMsg.innerHTML = 'Transaction failed! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/" + hash + "' target='_blank'>" + hash + "</a>"
        errorMsg.style.display = 'block';
        return;
    }

    successMsg.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/"+hash+"' target='_blank'>"+hash+"</a>";
    successMsg.style.display = 'block';

}

function exportPrivateKey() {
    let exportable = toHexString(unencryptedPrivateKey);
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportable));
    element.setAttribute('download', 'privateKey.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}