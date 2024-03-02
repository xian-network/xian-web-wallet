window.addEventListener("lamdenWalletGetInfo", (event) => {
    console.log(event.origin);
});

window.addEventListener("lamdenWalletConnect", (event) => {
    console.log(event.origin);
});

window.addEventListener("lamdenWalletSendTx", (event) => {
    console.log(event.origin);
});

window.addEventListener("auth", (event) => {
    console.log(event.origin);
});