function acceptRequest() {
    let contract = document.getElementById('requestTransactionContract').innerHTML;
    let method = document.getElementById('requestTransactionFunction').innerHTML;
    let kwargs = JSON.parse(document.getElementById('requestTransactionParams').innerHTML);
    let stampLimit = parseInt(document.getElementById('requestTransactionStampLimit').innerHTML);

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
    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
    broadcastTransaction(signed_tx).then((response) => {
        let status = 'success'
        if (response['result']['code'] == 1) {
            status = 'error';
        }
        hash = response['result']['hash'];
        prependToTransactionHistory(hash, contract, method, kwargs, status, new Date().toLocaleString());

        if (response['result']['code'] == 1) {
            sendResponse({errors: [response['result']['log']]});
            changePage('wallet');
        }
        else {
            sendResponse({status: 'sent', txid: hash});
            changePage('wallet');
        }
    }).catch((error) => {
        alert('RPC ERR');
        changePage('wallet');
    });
});
}

function rejectRequest() {
    sendResponse({errors: ['rejected']});
    changePage('wallet');
}

document.getElementById('request-transaction-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-transaction-reject').addEventListener('click', function() {
    rejectRequest();
});