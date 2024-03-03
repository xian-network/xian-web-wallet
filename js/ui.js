function createWallet() {
    let password = document.getElementById('password').value;
    let confirmPassword = document.getElementById('confirmPassword').value;
    let createWalletError = document.getElementById('createWalletError');

    if (password !== confirmPassword) {
        createWalletError.innerHTML = 'Passwords do not match!';
        createWalletError.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        createWalletError.innerHTML = 'Password must be at least 6 characters long!';
        createWalletError.style.display = 'block';
        return;
    }

    createWalletError.style.display = 'none';
    
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

    hash = JSON.parse(response)['result']['deliver_tx']['hash'];
    response = atob(JSON.parse(response)['result']['deliver_tx']['data']);
    
    successMsg.innerHTML = 'Transaction sent successfully! Hash: ' + "<a href='https://explorer.xian.org/tx/"+hash+"' target='_blank'>"+hash+"</a>";
    successMsg.style.display = 'block';

}