const isJSON = (json) => {
	if (Object.prototype.toString.call(json) !== "[object String]") return false
    try{
        return JSON.parse(json)
    }catch (e){ return false}
}

document.addEventListener('xianWalletGetInfo', (event) => {
    const detail = event.detail
    getWalletInfo()
});

document.addEventListener('xianWalletSendTx', (event) => {
    const detail = event.detail
    if (isJSON(detail)) {
        xianWalletSendTx(detail)}
    else{
        const errors = ['Expected event detail to be JSON string']
        document.dispatchEvent(new CustomEvent('xianWalletTxStatus', {detail: {errors, rejected: detail}}));
        return
    }
});

const xianWalletSendTx = (detail) => { 
    chrome.runtime.sendMessage({type: 'dAppSendTransaction', data: detail}, (response) => {
        if (chrome.runtime.lastError) return
        if(response !== 'ok'){
            returnTxStatusToPage(response)
        }
    });
}

const getWalletInfo = () => {  
    chrome.runtime.sendMessage({type: 'getWalletInfo'}, (response) => {
        if(!chrome.runtime.lastError || response !== 'ok'){
            document.dispatchEvent(new CustomEvent('xianWalletInfo', {detail: response}));
        }
    });
}


// Docs
// Dispatch xianWalletGetInfo event to send request for wallet info
// document.dispatchEvent(new CustomEvent('xianWalletGetInfo'));
// Listen for xianWalletInfo event to get wallet info response
document.addEventListener('xianWalletInfo', (event) => {
    const detail = event.detail
    console.log(detail)
});