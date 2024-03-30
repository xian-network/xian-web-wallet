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