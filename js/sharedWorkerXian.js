const ports = [];

self.onconnect = function(e) {
    const port = e.ports[0];
    ports.push(port);

    port.onmessage = function(event) {
        // Example message handling
        const { action } = event.data; // Assuming event.data contains an action property

        // Broadcast the action to all connected tabs except the sender
        ports.forEach(p => {
            if (p !== port) {
                if (action === "xianWalletGetInfo") {
                    p.postMessage({ action: "xianWalletInfo" });
                }
                if (action === "xianWalletConnect") {
                    p.postMessage({ action: "xianWalletInfo" });
                }
                if (action === "xianWalletSendTx") {
                    p.postMessage({ action: "xianWalletTxResult" });
                }
                if (action === "xianAuth") {
                    p.postMessage({ action: "authReturn" });
                }
            }
        });
    };

    port.start(); // Start the port to begin receiving messages
};