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
    let stamps = document.getElementById("tokenFee").innerHTML;
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

    let functionInfo;
    getContractFunctions(contractName)
        .then(functions => {
            functionInfo = functions.methods.find(func => func.name === functionName);
            functionInfo.arguments.forEach(arg => {
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
                if (expectedType === "Any") {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = value.toString();
                    }
                }
                kwargs[arg.name] = value;
            });
            payload.payload.kwargs = kwargs;

            Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then(signed_tx => {
                let conf = confirm("Are you sure you want to send this transaction?");
                if (!conf) return;
                broadcastTransaction(signed_tx).then(response => {
                    hash = response['result']['hash'];
                    let status = 'pending'
                    if (response['result']['code'] == 1) {
                        status = 'error';
                    }
                    prependToTransactionHistory(hash, contractName, functionName, kwargs, status, new Date().toLocaleString());
    
                    if (response['result']['code'] == 1) {
                        error.innerHTML = response["result"]["log"];
                        error.style.display = 'block';
                        return;
                    } else {
                        success.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='"+EXPLORER+"/tx/" + hash + "' target='_blank'>" + hash + "</a>"
                        success.style.display = 'block';
                    }
                }).catch(error_ => {
                    console.error('Error sending advanced transaction:', error_);
                    alert('Error sending advanced transaction: ' + error_.message);
                });
            })
        })
        .catch(error_ => {
            console.error('Error sending advanced transaction:', error_);
            alert('Error sending advanced transaction: ' + error_.message);
        });
}

 document.getElementById('btn-adv-tx-send').addEventListener('click', function() {
     sendAdvTx();
 });


 function loadAdvancedTransactionPage() {
    document.getElementById("adv_args").style.display = "none";
    document.getElementById("contractName").addEventListener("focusout", function () {
        let contractName = document.getElementById("contractName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        let functionSelect = document.getElementById("functionName");
        let args = document.getElementById("adv_args");
        error.style.display = "none";
        success.style.display = "none";

        getContractFunctions(contractName)
            .then(functions => {
                if (functions === null) {
                    error.innerHTML = "Contract does not exist!";
                    error.style.display = "block";
                    functionSelect.innerHTML = "";
                    args.style.display = "none";
                    return;
                }
                functionSelect.innerHTML = "";
                functionSelect.innerHTML += "<option value=''>Select a function</option>";
                console.log(functions);
                functions.methods.forEach((func) => {
                    functionSelect.innerHTML +=
                      "<option value='" + func.name + "'>" + func.name + "</option>";
                });
            })
            .catch(error_ => {
                console.error('RPC error:', error_);
                error.innerHTML = "RPC error!";
                error.style.display = "block";
            });
    });

    document.getElementById("functionName").addEventListener("change", function () {
        let contractName = document.getElementById("contractName").value;
        let functionName = document.getElementById("functionName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        error.style.display = "none";
        success.style.display = "none";
        let args = document.getElementById("adv_args");
        let list_kwargs = document.getElementById("adv_kwargs");

        getContractFunctions(contractName)
            .then(functions => {
                if (functions !== null) {
                    args.style.display = "block";
                    let functionInfo = functions.methods.find(
                      (func) => func.name === functionName
                    );
                    list_kwargs.innerHTML = "";
                    functionInfo.arguments.forEach((arg) => {
                      list_kwargs.innerHTML +=
                        `<div class="form-group kwarg-group">
                        <label for="` +
                        arg.name +
                        `">` +
                        arg.name +
                        `(` +
                        arg.type +
                        `)</label>
                        <input type="text" class="form-control" id="` +
                        arg.name +
                        `">
                    </div>`;
                    });
                }
            })
            .catch(error_ => {
                console.error('RPC error:', error_);
                error.innerHTML = "RPC error!";
                error.style.display = "block";
            });
    });
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

debouncedEstimateSendStamps = debounce(estimateSendStamps, 300);

document.getElementById('functionName').addEventListener('input', function() {
    debouncedEstimateSendStamps();

});


document.getElementById('contractName').addEventListener('input', function() {
    debouncedEstimateSendStamps();
});

document.getElementById('adv_args').childNodes.forEach(function (arg) {
    arg.addEventListener('input', function() {
        debouncedEstimateSendStamps();
    });
});

async function estimateSendStamps(){
    let error = document.getElementById('sendAdvTxError');
    let success = document.getElementById('sendAdvTxSuccess');
    error.style.display = 'none';
    success.style.display = 'none';
    let function_name = document.getElementById('functionName').value;
    let contract = document.getElementById('contractName').value;
    let estimation_loading = document.getElementById('estimation-loading');
    let estimation_finished = document.getElementById('estimation-result');
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    let send_btn = document.getElementById('btn-adv-tx-send');
    send_btn.disabled = true;

    let functionInfo;
    let kwargs = {};
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: function_name,
            kwargs: kwargs,
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };
    if (function_name === "" || contract === "") {
        return;
    }
    functionInfo = await getContractFunctions(contract)
        .then(functions => {
            functionInfo = functions.methods.find(func => func.name === function_name);
            functionInfo.arguments.forEach(arg => {
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
                if (expectedType === "Any") {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = value.toString();
                    }
                }
                kwargs[arg.name] = value;
            });
            transaction.payload.kwargs = kwargs;
        })
        .catch(error_ => {
            console.error('Error estimating stamps:', error_);
            document.getElementById('tokenFee').innerHTML = "..";
        });

    


    try {
        let signed_tx = await signTransaction(transaction, unencryptedPrivateKey);
        let stamps = await estimateStamps(signed_tx);
        stamps = stamps["stamps"];
        
        let stamp_rate = await getStampRate();
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        send_btn.disabled = false;
        if (stamps === null) {
            document.getElementById('tokenFee').innerHTML = 0;
            return;
        }
        document.getElementById('tokenFeeXian').innerHTML = stamps / stamp_rate;
        document.getElementById('tokenFee').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('tokenFee').innerHTML = "Error";
    }
    document.getElementById('tokenFeeContainer').style.display = 'block';
}

loadAdvancedTransactionPage();
