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
    locked = false;
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
    locked = false;
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

function copyTextToClipboard(text) {
    let element = document.createElement('textarea');
    element.value = text;
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
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
    locked = true;
    localStorage.removeItem('tx_history');
    tx_history = [];
    changePage('get-started');
}

function clearLocalActivity() {
    let confirm_clear = confirm("Are you sure you want to clear the local activity?");
    if (!confirm_clear) {
        return;
    }
    localStorage.removeItem('tx_history');
    tx_history = [];
    loadWalletPage();
}

function unlockWallet() {
    Promise.all([
        readSecureCookie('encryptedPrivateKey'),
        readSecureCookie('publicKey')
    ]).then((values) => {
        let password = document.getElementById('unlock_password').value;
        let encryptedPrivateKey = values[0];
        let publicKey = values[1];
        let _unencryptedPrivateKey = decryptPrivateKey(encryptedPrivateKey, password, publicKey);
        if (_unencryptedPrivateKey == null) {
            document.getElementById('passwordError').style.display = 'block';
            document.getElementById('passwordError').innerHTML = 'Incorrect password!';
            return;
        }
        document.getElementById('passwordError').style.display = 'none';

        unencryptedPrivateKey = _unencryptedPrivateKey;
        locked = false;
        changePage('wallet');
    });
}

function lockWallet() {
    unencryptedPrivateKey = null;
    locked = true;
    changePage('password-input');
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

function sendTokenScreen(contract) {
    changePage('send-token', contract);
}

function receiveTokenScreen() {
    changePage('receive-token');
}

function refreshBalance(contract) {
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
        let balance = getVariable(contract, "balances",values[0]);
        if (balance === null) {
            balance = "0";
        }
        balance = parseFloat(balance);
        balance = balance.toFixed(8);
        document.getElementById(contract+'Balance').innerHTML = balance;
    });
}

function sendToken() {
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
    let contract = document.getElementById('tokenName').innerHTML;
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

    if (amount > parseFloat(getVariable(contract, "balances", values[0]))) {
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
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: "transfer",
            kwargs: {
                to: recipient,
                amount: amount
            },
            stamps_supplied: 100
        },
        metadata: {
            signature: "",
        }
    };

    let signed_tx = signTransaction(transaction, unencryptedPrivateKey);
    let conf = confirm("Are you sure you want to send this transaction?");
    if (!conf) return;
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];
    let status = 'success'
    if (response['result']['code'] == 1) {
        status = 'error';
    }
    prependToTransactionHistory(hash, contract, 'transfer', {to: recipient, amount: amount}, status, new Date().toLocaleString());

    if (response['result']['code'] == 1) {
        errorMsg.innerHTML = response["result"]["log"];
        errorMsg.style.display = 'block';
        return;
    }

    successMsg.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/"+hash+"' target='_blank'>"+hash+"</a>";
    successMsg.style.display = 'block';

    });
}

function exportPrivateKey() {
    try {
        let exportable = toHexString(unencryptedPrivateKey);
        // if the key is longer than 64 characters it includes the public key as well. then we need to remove it. we only need the first 64 characters
        if (exportable.length > 64) {
            exportable = exportable.substring(0, 64);
        }
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportable));
        element.setAttribute('download', 'privateKey.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } catch (e) {
        let exportable = toHexString(unencryptedPrivateKey);
        // if the key is longer than 64 characters it includes the public key as well. then we need to remove it. we only need the first 64 characters
        if (exportable.length > 64) {
            exportable = exportable.substring(0, 64);
        }
        copyTextToClipboard(exportable);
    }
}

function addToken() {
  let successMsg = document.getElementById("addTokenSuccess");
  let errorMsg = document.getElementById("addTokenError");
  document.getElementById("addTokenSuccess").style.display = "none";
  document.getElementById("addTokenError").style.display = "none";
  let contractNameAddToken = document.getElementById(
    "contractNameAddToken"
  ).value;
  contractNameAddToken = contractNameAddToken.trim();
  let token_info = null;
  try {
    token_info = getTokenInfo(contractNameAddToken);
  } catch (e) {
    errorMsg.style.display = "block";
    errorMsg.innerHTML = "RPC error!";
    return;
  }
  if (token_info.name === null || token_info.symbol === null) {
    errorMsg.style.display = "block";
    errorMsg.innerHTML = "Token does not exist!";
    return;
  }
  if (!token_list.includes(contractNameAddToken)) {
    token_list.push(contractNameAddToken);
    localStorage.setItem("token_list", JSON.stringify(token_list));
    successMsg.style.display = "block";
    successMsg.innerHTML = "Token added successfully!";
  } else {
    errorMsg.style.display = "block";
    errorMsg.innerHTML = "Token already exists!";
  }
}

function removeToken(contract) {
  let confirmation = confirm("Are you sure you want to remove this token?");
  if (!confirmation) return;
  token_list = token_list.filter((token) => token !== contract);
  localStorage.setItem("token_list", JSON.stringify(token_list));
  loadWalletPage();
}

function sendAdvTx() {
    let contractName = document.getElementById("contractName").value;
    let functionName = document.getElementById("functionName").value;
    let error = document.getElementById("sendAdvTxError");
    let success = document.getElementById("sendAdvTxSuccess");
    error.style.display = "none";
    success.style.display = "none";
    let args = document.getElementById("adv_args");
    let list_kwargs = document.getElementById("adv_kwargs");
    let kwargs = {};
    let stamps = document.getElementById("stampLimit").value;
    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contractName,
            function: functionName,
            kwargs: {},
            stamps_supplied: parseInt(stamps)
        },
        metadata: {
            signature: "",
        }
    };
    
    let functionInfo = getContractFunctions(contractName).methods.find(
        (func) => func.name === functionName
    );
    functionInfo.arguments.forEach((arg) => {
        let value = document.getElementById(arg.name).value;
        let expectedType = arg.type;
        if (value === "") {
            error.innerHTML = "All fields are required!";
            error.style.display = "block";
            return;
        }
        if (expectedType === "int") {
            if (isNaN(value)) {
                error.innerHTML = "Invalid value for " + arg.name + "!";
                error.style.display = "block";
                return;
            }
            value = parseInt(value);
        }
        if (expectedType === "float") {
            if (isNaN(value)) {
                error.innerHTML = "Invalid value for " + arg.name + "!";
                error.style.display = "block";
                return;
            }
            value = parseFloat(value);
        }
        if (expectedType === "bool") {
            if (value !== "true" && value !== "false") {
                error.innerHTML = "Invalid value for " + arg.name + "!";
                error.style.display = "block";
                return;
            }
            value = value === "true";
        }
        if (expectedType === "str") {
            value = value.toString();
        }
        if (expectedType === "dict" || expectedType === "list") {
            try {
                value = JSON.parse(value);
            } catch (e) {
                error.innerHTML = "Invalid value for " + arg.name + "!";
                error.style.display = "block";
                return;
            }
        }
        kwargs[arg.name] = value;
    });
    payload.payload.kwargs = kwargs;
    let signed_tx = signTransaction(payload, unencryptedPrivateKey);
    let conf = confirm("Are you sure you want to send this transaction?");
    if (!conf) return;
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];
    let status = 'success'
    if (response['result']['code'] == 1) {
        status = 'error';
    }
    prependToTransactionHistory(hash, contractName, functionName, kwargs, status, new Date().toLocaleString());

    if (response['result']['code'] == 1) {
        error.innerHTML = response["result"]["log"];
        error.style.display = 'block';
        return;
    }

    else {
        success.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/" + hash + "' target='_blank'>" + hash + "</a>"
        success.style.display = 'block';
    }
}

function submitContract() {
    let contract = document.getElementById("submitContractName").value;
    let contractError = document.getElementById("submitContractError");
    let contractSuccess = document.getElementById("submitContractSuccess");
    let stampLimit = document.getElementById("submitContractstampLimit").value;
    contractError.style.display = 'none';
    contractSuccess.style.display = 'none';

    if (contract === "") {
        contractError.innerHTML = 'Contract name is required!';
        contractError.style.display = 'block';
        return;
    }

    if (!contract.startsWith('con_')) {
        contractError.innerHTML = 'Contract name must start with con_';
        contractError.style.display = 'block';
        return;
    }

    if (stampLimit === "") {
        contractError.innerHTML = 'Stamp limit is required!';
        contractError.style.display = 'block';
        return;
    }

    let contractCode = editor.getValue();

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: {
                name: contract,
                code: contractCode
            },
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: {
            signature: "",
        }
    };

    let signed_tx = signTransaction(payload, unencryptedPrivateKey);
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];
    let status = 'success'
    if (response['result']['code'] == 1) {
        status = 'error';
    }
    prependToTransactionHistory(hash, 'submission', 'submit_contract', {name: contract, code: contractCode}, status, new Date().toLocaleString());

   if (response["result"]["code"] == 1) {
     contractError.innerHTML = response["result"]["log"];
       contractError.style.display = "block";
     return;
   } else {
     contractSuccess.innerHTML =
       "Transaction sent successfully! Explorer: " +
       "<a class='explorer-url' href='https://explorer.xian.org/tx/" +
       hash +
       "' target='_blank'>" +
       hash +
       "</a>";
       contractSuccess.style.display = "block";
   }
    
}

function acceptRequest() {
    let contract = document.getElementById('contractRequest').innerHTML;
    let method = document.getElementById('methodRequest').innerHTML;
    let kwargs = JSON.parse(document.getElementById('kwargsRequest').innerHTML);
    let stampLimit = document.getElementById('stampLimitRequest').innerHTML;
    let error = document.getElementById('requestError');
    let success = document.getElementById('requestSuccess');
    error.style.display = 'none';
    success.style.display = 'none';

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: method,
            kwargs: kwargs,
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: {
            signature: "",
        }
    };

    let signed_tx = signTransaction(payload, unencryptedPrivateKey);
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];

    let response_to_wallet = {
      type: "responseTransaction",
      data: {
        txid: "",
        status: "",
      },
    };

    if (response['result']['code'] == 1) {
        error.innerHTML = response["result"]["log"];
        error.style.display = 'block';
        response_to_wallet.data.status = 'error';
        response_to_wallet = JSON.stringify(response_to_wallet);
        current_request_event.source.postMessage(
          response_to_wallet,
          request_event.origin
        );
        current_request_event = null;
        changePage('wallet');
        return;
    }
    response_to_wallet.data.txid = hash;
    response_to_wallet.data.status = 'sent';
    response_to_wallet = JSON.stringify(response_to_wallet);
    current_request_event.source.postMessage(
      response_to_wallet,
        current_request_event.origin
    );
    // Switch focus back to the window that sent the request
    try {
        current_request_event.source.focus();
    }
    catch (e) {
        // Do nothing
    }
    current_request_event = null;
    changePage('wallet');
}

function rejectRequest() {
  let response_to_wallet = {
    type: "responseTransaction",
    data: {
      txid: "",
      status: "rejected",
    },
  };
  response_to_wallet = JSON.stringify(response_to_wallet);
  current_request_event.source.postMessage(
    response_to_wallet,
    current_request_event.origin
  );
  // Switch focus back to the window that sent the request
  try {
    current_request_event.source.focus();
  } catch (e) {
    // Do nothing
  }
  current_request_event = null;
  changePage("wallet");
}

function visitDApp() {
    let dapp_url = prompt("Enter the URL of the DApp");
    if (dapp_url) {
      window.open(dapp_url);
    }
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