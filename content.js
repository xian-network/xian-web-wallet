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

document.addEventListener('xianWalletSignMsg', (event) => {
    xianWalletSignMsg(event.detail)
});

document.addEventListener('xianWalletAddToken', (event) => {
    xianWalletAddToken(event.detail)
});

const xianWalletSendTx = (detail) => { 
    chrome.runtime.sendMessage({type: 'dAppSendTransaction', data: detail}, (response) => {
        if(!chrome.runtime.lastError || response !== 'ok'){
            document.dispatchEvent(new CustomEvent('xianWalletTxStatus', {detail: response}));
            handleFocus();
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

const xianWalletSignMsg = (detail) => {
    chrome.runtime.sendMessage({type: 'dAppSignMessage', data: detail}, (response) => {
        if(!chrome.runtime.lastError || response !== 'ok'){
            document.dispatchEvent(new CustomEvent('xianWalletSignMsgResponse', {detail: response}));
            handleFocus();
        }
    });
}

const xianWalletAddToken = (detail) => {
    chrome.runtime.sendMessage({type: 'dAppAddToken', data: detail}, (response) => {
        if(!chrome.runtime.lastError || response !== 'ok'){
            document.dispatchEvent(new CustomEvent('xianWalletAddTokenResponse', {detail: response}));
            handleFocus();
        }
    });
}

const handleFocus = () => {
    window.blur();
    setTimeout(() => {
        window.focus();
    }, 100);
};

// Dispatch xianReady event when the content script is loaded and ready
document.dispatchEvent(new CustomEvent('xianReady'));
