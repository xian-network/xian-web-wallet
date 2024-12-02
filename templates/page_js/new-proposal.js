document.getElementById("create-proposal-cancel").addEventListener("click", () => {
    changePage("governance");
});

document.getElementById('proposalType').addEventListener('input', function(e) {
    estimateProposalStamps();
});

document.getElementById('proposalValue').addEventListener('input', function(e) {
    estimateProposalStamps();
});

document.getElementById('create-proposal-create').addEventListener('click', function(e) {
    sendProposal();
});

function sendProposal() {
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
        let type = document.getElementById('proposalType').value;
        let value = document.getElementById('proposalValue').value;
        let successMsg = document.getElementById('proposalSuccess');
        let errorMsg = document.getElementById('proposalError');
        successMsg.style.display = 'none';
        errorMsg.style.display = 'none';

        // if value is a number, convert it to a number
        if (!isNaN(value)) {
            value = parseInt(value);
        }
        // if value is valid JSON, parse it
        else {
            try {
                value = JSON.parse(value);
            } catch (e) {
                // do nothing
            }
        }

       

        let transaction = {
            payload: {
                chain_id: CHAIN_ID,
                contract: "masternodes",
                function: "propose_vote",
                kwargs: {
                    type_of_vote: type,
                    arg: value
                },
                stamps_supplied: parseInt(document.getElementById('proposalFee').innerHTML) + 10
            },
            metadata: {
                signature: "",
            }
        };
        Promise.all([signTransaction(transaction, unencryptedPrivateKey)]).then(signed_tx => {
            let conf = confirm("Are you sure you want to send this transaction?");
            if (!conf) return;
            
            broadcastTransaction(signed_tx).then(response => {
                console.log(response)
                const hash = response['result']['hash'];
                let status = 'pending';
                if (response['result']['code'] == 1) {
                    status = 'error';
                }
                
                prependToTransactionHistory(hash, 'masternodes', 'propose_vote', {'type_of_vote':type, 'value':value}, status, new Date().toLocaleString());

                if (response['result']['code'] == 1) {
                    errorMsg.innerHTML = response["result"]["log"];
                    errorMsg.style.display = 'block';
                    return;
                }

                successMsg.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='"+EXPLORER+"/tx/"+hash+"' target='_blank'>"+hash+"</a>";
                successMsg.style.display = 'block';
            });
        });
    }).catch(error => {
        console.error("Error reading secure cookie:", error);
    });
}

async function estimateProposalStamps(){
    let type = document.getElementById('proposalType').value;
    let value = document.getElementById('proposalValue').value;
    if (type === '' || value === '') return;

    // if value is a number, convert it to a number
    if (!isNaN(value)) {
        value = parseInt(value);
    }
    // if value is valid JSON, parse it
    else {
        try {
            value = JSON.parse(value);
        } catch (e) {
            // do nothing
        }
    }

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "masternodes",
            function: "propose_vote",
            kwargs: {
                type_of_vote: type,
                arg: value
            },
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };

    try {
        let signed_tx = await signTransaction(transaction, unencryptedPrivateKey);
        let stamps = await estimateStamps(signed_tx);
        stamps = stamps["stamps"];
        if (stamps === null) {
            document.getElementById('proposalFee').innerHTML = 0;
            return;
        }
        stamps = stamps;
        let stamp_rate = await getStampRate();
        document.getElementById('proposalFeeXian').innerHTML = stamps / stamp_rate;
        document.getElementById('proposalFee').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('proposalFee').innerHTML = "Error";
    }
    document.getElementById('proposalFeeContainer').style.display = 'block';
}