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
  goToWallet();
}

document.getElementById('request-accept-request').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-reject-request').addEventListener('click', function() {
    rejectRequest();
});