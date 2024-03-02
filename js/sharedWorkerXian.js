const ports = [];

self.onconnect = function(e) {
    const port = e.ports[0];
    ports.push(port);

    port.onmessage = function(event) {
        const { action } = event.data; // Assuming event.data contains an action property
        if (action === "hello") {
            port.postMessage({ action: "hello back" });
        }
        if (action === "xianWalletGetInfo") {
            port.postMessage({ action: "xianWalletInfo" });
        }
        if (action === "xianWalletConnect") {
            port.postMessage({ action: "xianWalletInfo" });
        }
        if (action === "xianWalletSendTx") {
            port.postMessage({ action: "xianWalletTxResult" });
        }
        if (action === "xianAuth") {
            port.postMessage({ action: "authReturn" });
        }
    };

    port.start(); // Start the port to begin receiving messages
};