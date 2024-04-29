const isJSON = (json) => {
	if (Object.prototype.toString.call(json) !== "[object String]") return false
    try{
        return JSON.parse(json)
    }catch (e){ return false}
}

document.addEventListener('xianWalletGetInfo', (event) => {
    getWalletInfo()
});

document.addEventListener('xianWalletSendTx', (event) => {
    xianWalletSendTx(event.detail)
});

const xianWalletSendTx = (detail) => { 
    chrome.runtime.sendMessage({type: 'dAppSendTransaction', data: detail}, (response) => {
        if(!chrome.runtime.lastError || response !== 'ok'){
            document.dispatchEvent(new CustomEvent('xianWalletTxStatus', {detail: response}));
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
