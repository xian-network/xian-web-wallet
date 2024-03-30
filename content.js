chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //Accept only messages from extention background script
    if(sender.id === chrome.runtime.id && sender.origin === "null"){ 
        
    }
});