function sendToken() {
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
        let contract = document.getElementById('tokenName').innerHTML;
        let recipient = document.getElementById('toAddress').value;
        let amount = document.getElementById('tokenAmount').value;
        let successMsg = document.getElementById('sendTokenSuccess');
        let errorMsg = document.getElementById('sendTokenError');
        let xnsFoundAddress = document.getElementById('xnsFoundAddress');
        if (xnsFoundAddress.innerHTML !== '') {
            recipient = xnsFoundAddress.innerHTML;
        }

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
                    stamps_supplied: parseInt(document.getElementById('tokenFee').innerHTML)
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
                    
                    prependToTransactionHistory(hash, contract, 'transfer', {to: recipient, amount: amount}, status, new Date().toLocaleString());

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

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

debouncedEstimateSendStamps_ = debounce(estimateSendStamps, 500);
document.getElementById('toAddress').addEventListener('input', getXNSAddress);
document.getElementById('toAddress').addEventListener('input', debouncedEstimateSendStamps_);
document.getElementById('tokenAmount').addEventListener('input', debouncedEstimateSendStamps_);

async function loadPage() {
    let tokenInfo = await getTokenInfo(document.getElementById('tokenName').innerHTML);
    document.getElementById('realTokenName').innerHTML = tokenInfo['name'];

    let tokenBalance = await execute_balance_of(document.getElementById('tokenName').innerHTML, publicKey);
    let formattedBalance = "0";
    if (tokenBalance !== null) {
        formattedBalance = parseFloat(tokenBalance).toFixed(8);
    }
    document.getElementById('maxTokenAmount').innerHTML = formattedBalance;

    document.getElementById('maxTokenAmount').style.display = 'inline-block';
    document.getElementById('realTokenName').style.display = 'inline-block';

    document.getElementById('maxTokenAmount').addEventListener('click', function() {
        document.getElementById('tokenAmount').value = formattedBalance;
        estimateSendStamps().then(() => {
            if(document.getElementById('tokenName').innerHTML == 'currency') {
                document.getElementById('tokenAmount').value = formattedBalance - document.getElementById('tokenFeeXian').innerHTML;
                }
        });
       
    });
}

(async () => {
    await loadPage();
})();

async function estimateSendStamps(){
    let recipient = document.getElementById('toAddress').value;
    let amount = document.getElementById('tokenAmount').value;
    let contract = document.getElementById('tokenName').innerHTML;
    let send_btn = document.getElementById('send-token-send-token');
    let estimation_loading = document.getElementById('estimation-loading');
    let estimation_finished = document.getElementById('estimation-result');
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    send_btn.disabled = true;
    if (recipient === '' || amount === '') return;

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: "transfer",
            kwargs: {
                to: recipient,
                amount: parseFloat(amount)
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
        let stamp_rate = await getStampRate();
        send_btn.disabled = false;
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        if (stamps === null) {
            document.getElementById('tokenFee').innerHTML = 0;
            return;
        }
        stamps = stamps;
        document.getElementById('tokenFeeXian').innerHTML = stamps / stamp_rate;
        document.getElementById('tokenFee').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('tokenFee').innerHTML = "Error";
    }
    document.getElementById('tokenFeeContainer').style.display = 'block';
}

async function getXNSAddress(){
    let name = document.getElementById('toAddress').value;
    let xns_found = document.querySelector('.xns-found');
    document.getElementById('xnsFoundAddress').innerHTML = '';
    xns_found.style.display = 'none';
    if (name === '') return;
    if (name.length < 3) return;
    if (name.length > 32) return;
    if (!/^[a-zA-Z0-9]+$/.test(name)) {
        return;
    }
    let address = await execute_get_main_name_to_address(name);
    if (address === "None") {
        return;
    }
    xns_found.style.display = 'block';
    document.getElementById('xnsFoundAddress').innerHTML = address;

}
