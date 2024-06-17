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
        
        let stamp_rate = await getStampRate();
        if (stamps === null) {
            document.getElementById('requestTransactionStampLimit').innerHTML = 0;
            return;
        }
        stamps = stamps;
        document.getElementById('requestTransactionStampLimitXian').innerHTML = stamps / stamp_rate;
        document.getElementById('requestTransactionStampLimit').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('requestTransactionStampLimit').innerHTML = "Error";
    }
}

(async function() {
    let acceptBtn = document.getElementById('request-transaction-accept');
    let stamp_line = document.getElementById('stamp_line');
    let stamp_line_finished = document.getElementById('stamp_line_finished');
    stamp_line.style.display = 'block';
    acceptBtn.disabled = true;
    await estimateRequestStamps();
    stamp_line.style.display = 'none';
    stamp_line_finished.style.display = 'block';
    acceptBtn.disabled = false;
})();
