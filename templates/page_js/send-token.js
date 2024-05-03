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

        getVariable(contract, "balances", values[0]).then(balance => {
            if (amount > parseFloat(balance)) {
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
            signTransaction(transaction, unencryptedPrivateKey).then(signed_tx => {
                let conf = confirm("Are you sure you want to send this transaction?");
                if (!conf) return;
                broadcastTransaction(signed_tx).then(response => {
                    const hash = response['result']['hash'];
                    let status = 'success';
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
            });
        }).catch(error => {
            console.error("Error fetching balance:", error);
        });
    }).catch(error => {
        console.error("Error reading secure cookie:", error);
    });
}


document.getElementById('send-token-send-token').addEventListener('click', function() {
    sendToken();
});
document.getElementById('send-token-cancel').addEventListener('click', function() {
    goToWallet();
});