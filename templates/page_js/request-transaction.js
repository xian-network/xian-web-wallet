

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
    console.log(payload);
    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
        broadcastTransaction(signed_tx).then((response) => {
            let status = 'pending'
            if (response['result']['code'] == 1) {
                status = 'error';
            }
            hash = response['result']['hash'];
            prependToTransactionHistory(hash, contract, method, kwargs, status, new Date().toLocaleString());

            if (response['result']['code'] == 1) {
                window.opener.postMessage({type: 'REQUEST_TRANSACTION', data: {errors: [response['result']['log']]},callbackKey: callbackKey}, '*');
                toast('danger', 'Error sending transaction: ' + response['result']['log']);
                // Close the window
                window.close();
            }
            else {
                window.opener.postMessage({type: 'REQUEST_TRANSACTION', data: {status: 'sent', txid: hash},callbackKey: callbackKey}, '*');
                toast('success', 'Transaction sent: <a class="text-light" style=" text-overflow: ellipsis; width: 5rem; overflow: hidden; text-decoration: underline;margin-left: 0.25rem; " href="'+EXPLORER+'/tx/' + hash + '" target="_blank">' + hash + '</a>');
                window.close();
            }
        }).catch((error) => {
            window.close();
        });
    });
}

function rejectRequest() {
    window.opener.postMessage({type: 'REQUEST_TRANSACTION', data: {errors:['rejected']},callbackKey: callbackKey}, '*');
    toast('warning', 'Request rejected');
    window.close();
}

document.getElementById('request-transaction-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-transaction-reject').addEventListener('click', function() {
    rejectRequest();
});

// We need to also catch the case where the user closes the window
window.onbeforeunload = function() {
    rejectRequest();
};

async function estimateRequestStamps(){
    let contract = document.getElementById('requestTransactionContract').innerHTML;
    let method = document.getElementById('requestTransactionFunction').innerHTML;
    let kwargs = JSON.parse(document.getElementById('requestTransactionParams').innerHTML);
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: method,
            kwargs: kwargs,
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };

    try {
        let signed_tx = await signTransaction(transaction, unencryptedPrivateKey);
        let stamps = await estimateStamps(signed_tx);
        let success = stamps["success"];
        let result = stamps["tx_result"];
        stamps = stamps["stamps"];
        
        let stamp_rate = await getStampRate();
        if (stamps === null) {
            document.getElementById('requestTransactionStampLimit').innerHTML = 0;
            return;
        }
        stamps = stamps;

        if (success === false) {
            document.getElementById('failure-alert').classList.remove('d-none');
            document.getElementById('failure-reason').innerHTML = result;
        }


        document.getElementById('requestTransactionStampLimitXian').innerHTML = stamps / stamp_rate;
        document.getElementById('requestTransactionStampLimit').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('requestTransactionStampLimit').innerHTML = "Error";
    }
}

(async function() {
    await getChainID();
    let acceptBtn = document.getElementById('request-transaction-accept');
    let stamp_line = document.getElementById('stamp_line');
    let stamp_line_finished = document.getElementById('stamp_line_finished');
    stamp_line.style.display = 'block';
    acceptBtn.disabled = true;
    if (document.getElementById('requestTransactionStampLimit').innerHTML === 'undefined') {
        await estimateRequestStamps();
    }
    else {
        let stamp_rate = await getStampRate();
        let stamps = parseInt(document.getElementById('requestTransactionStampLimit').innerHTML);
        document.getElementById('requestTransactionStampLimitXian').innerHTML = stamps / stamp_rate;
    }
    stamp_line.style.display = 'none';
    stamp_line_finished.style.display = 'block';
    acceptBtn.disabled = false;
})();
