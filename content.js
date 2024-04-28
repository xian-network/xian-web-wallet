chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Message from background.js
    if(sender.id === chrome.runtime.id && sender.origin === "null"){ 
        
    }
    // Message from site this extension is injected into
    else{
        
    }
});