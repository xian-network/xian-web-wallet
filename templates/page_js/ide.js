var editor = CodeMirror(document.querySelector('#editor'), {
    value: "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'",
    mode:  "python",
});

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
    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
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
    });
}

// Get current stamp rate
document.getElementById("stampRate").innerHTML = getStampRate();

document.getElementById('btn-ide-submit-contract').addEventListener('click', function() {
    submitContract();
});
document.getElementById('btn-ide-go-to-wallet').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('ide-send-adv-tx').addEventListener('click', function() {
    changePage('send-advanced-transaction');
});
