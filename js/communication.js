if (!!window.SharedWorker) {
    const worker = new SharedWorker('js/sharedWorkerXian.js');

    worker.port.start();

    // Listen for messages from the SharedWorker
    worker.port.onmessage = function(event) {
        // Here you check the action and handle accordingly
        const { action, data } = event.data;
        switch(action) {
            case 'xianWalletInfo':
                console.log('Handling lamdenWalletGetInfo:', data);
                break;
            case 'xianWalletTxResult':
                console.log('Handling lamdenWalletConnect:', data);
                break;
            case 'authReturn':
                console.log('Handling authReturn:', data);
                break;
            default:
                console.log('Received action:', action, 'with data:', data);
        }
    };

    // Function to send a message (action) to the SharedWorker
    function sendActionToWorker(action, data) {
        worker.port.postMessage({ action: action, data: data });
    }

    sendActionToWorker('xianWalletConnect', { /* some data */ });
    sendActionToWorker('xianWalletGetInfo', { /* some data */ });
    sendActionToWorker('xianWalletSendTx', { /* some data */ });
} else {
    console.log("Your browser does not support SharedWorker.");
}