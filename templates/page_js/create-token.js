
if (typeof tokenContract === 'undefined') {
var tokenContract = `
balances = Hash(default_value=0)
metadata = Hash()
TransferEvent = LogEvent(event="Transfer", params={"from":{'type':str, 'idx':True}, "to": {'type':str, 'idx':True}, "amount": {'type':(int, float, decimal)}})
ApproveEvent = LogEvent(event="Approve", params={"from":{'type':str, 'idx':True}, "to": {'type':str, 'idx':True}, "amount": {'type':(int, float, decimal)}})


@construct
def seed():
    balances[ctx.caller] = 12345321

    metadata['token_name'] = "TOKEN_NAME"
    metadata['token_symbol'] = "TOKEN_SYMBOL"
    metadata['token_logo_url'] = 'TOKEN_LOGO_URL'
    metadata['token_website'] = 'TOKEN_WEBSITE'
    metadata['total_supply'] = 12345321
    metadata['operator'] = ctx.caller


@export
def change_metadata(key: str, value: Any):
    assert ctx.caller == metadata['operator'], 'Only operator can set metadata!'
    metadata[key] = value


@export
def balance_of(address: str):
    return balances[address]


@export
def transfer(amount: float, to: str):
    assert amount > 0, 'Cannot send negative balances!'
    assert balances[ctx.caller] >= amount, 'Not enough coins to send!'

    balances[ctx.caller] -= amount
    balances[to] += amount
    TransferEvent({"from": ctx.caller, "to": to, "amount": amount})


@export
def approve(amount: float, to: str):
    assert amount > 0, 'Cannot send negative balances!'

    balances[ctx.caller, to] = amount
    ApproveEvent({"from": ctx.caller, "to": to, "amount": amount})


@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, 'Cannot send negative balances!'
    assert balances[main_account, ctx.caller] >= amount, f'Not enough coins approved to send! You have {balances[main_account, ctx.caller]} and are trying to spend {amount}'
    assert balances[main_account] >= amount, 'Not enough coins to send!'

    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
    TransferEvent({"from": main_account, "to": to, "amount": amount})
`;
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

document.getElementById("btn-create-token-cancel").addEventListener("click", function() {
    changePage("wallet");
});

document.getElementById("NameCreateToken").addEventListener("input", function() {
    
    document.getElementById("ContractNameCreateToken").value = "con_" + document.getElementById("NameCreateToken").value.replaceAll(" ", "_").toLowerCase();
});



document.getElementById("NameCreateToken").addEventListener("input", debounce(estimateSendStamps, 500));

async function estimateSendStamps(){
    let estimation_loading = document.getElementById('estimation-loading');
    let estimation_finished = document.getElementById('estimation-result');
    let createTokenBtn = document.getElementById('btn-create-token-create');
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    createTokenBtn.disabled = true;

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "submission",
            function: "submit_contract",
            kwargs: {
                name: document.getElementById("ContractNameCreateToken").value,
                code: tokenContract,
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
        createTokenBtn.disabled = false;
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

document.getElementById("btn-create-token-create").addEventListener("click", async function() {
    tokenContract = tokenContract.replace("TOKEN_NAME", document.getElementById("NameCreateToken").value);
    tokenContract = tokenContract.replace("TOKEN_SYMBOL", document.getElementById("SymbolCreateToken").value);
    tokenContract = tokenContract.replaceAll("12345321", document.getElementById("SupplyCreateToken").value);
    tokenContract = tokenContract.replace("TOKEN_LOGO_URL", document.getElementById("LogoCreateToken").value);
    tokenContract = tokenContract.replace("TOKEN_WEBSITE", document.getElementById("WebsiteCreateToken").value);
    await estimateSendStamps();
    let createTokenError = document.getElementById("createTokenError");
    let createTokenSuccess = document.getElementById("createTokenSuccess");
    let createTokenBtn = document.getElementById("btn-create-token-create");
    let stampLimit = document.getElementById("tokenFee").textContent;
    createTokenError.style.display = "none";
    createTokenSuccess.style.display = "none";

    if (createTokenBtn.disabled) {
        return;
    }
    createTokenBtn.disabled = true;

    if (document.getElementById("NameCreateToken").value === "" || document.getElementById("SymbolCreateToken").value === "" || document.getElementById("SupplyCreateToken").value === "" || document.getElementById("ContractNameCreateToken").value === "") {
        createTokenError.innerHTML = "Please fill out all fields.";
        createTokenError.style.display = "block";
        createTokenBtn.disabled = false;
        return;
    }

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: {
                name: document.getElementById("ContractNameCreateToken").value,
                code: tokenContract,
            },
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: {
            signature: "",
        }
    };

    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
        broadcastTransaction(signed_tx).then((response) => {
            hash = response['result']['hash'];
            let status = 'pending'
            if (response['result']['code'] == 1) {
                status = 'error';
            }
            prependToTransactionHistory(hash, 'submission', 'submit_contract', { name: document.getElementById("ContractNameCreateToken").value, code: tokenContract }, status, new Date().toLocaleString());
            if (response["result"]["code"] == 1) {
                createTokenError.innerHTML = response["result"]["log"];
                createTokenError.style.display = "block";
                return;
            } else {
                createTokenSuccess.innerHTML =
                    "Token created successfully! Explorer: " +
                    "<a class='explorer-url' href='"+EXPLORER+"/tx/" +
                    hash +
                    "' target='_blank'>" +
                    hash +
                    "</a>";
                    createTokenSuccess.style.display = "block";
                token_list.push(document.getElementById("ContractNameCreateToken").value);
                localStorage.setItem("token_list", JSON.stringify(token_list));
                createTokenBtn.disabled = false;
            }
        }).catch((error) => {
            console.error("Error submitting contract:", error.message);
            createTokenError.innerHTML = "Error submitting contract!";
            createTokenError.style.display = "block";
        });
    });
});