var app_page = "get-started";
var app_box = document.getElementById("app-box");
var publicKey = null;
var unencryptedPrivateKey = null;

function changePage(page) {
    app_page = page;
    switch (app_page) {
        case "get-started":
            // load html template from templates/get-started.html
            fetch("templates/get-started.html")
                .then(response => response.text())
                .then(data => app_box.innerHTML = data);
            break;
        case "create-wallet":
            // load html template from templates/create-wallet.html
            fetch("templates/create-wallet.html")
                .then(response => response.text())
                .then(data => app_box.innerHTML = data);
            break;
        case "import-wallet":
            // load html template from templates/import-wallet.html
            fetch("templates/import-wallet.html")
                .then(response => response.text())
                .then(data => app_box.innerHTML = data);
            break;
        case "wallet":
            // load html template from templates/wallet.html
            fetch("templates/wallet.html")
                .then(response => response.text())
                .then (data => {
                    app_box.innerHTML = data;
                    loadWalletPage();
                });
            break;
        case "password-input":
            // load html template from templates/password-input.html
            fetch("templates/password-input.html")
                .then(response => response.text())
                .then(data => app_box.innerHTML = data);
            break;
        default:
            break;
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    if (readSecureCookie('publicKey') && readSecureCookie('encryptedPrivateKey') && unencryptedPrivateKey != null) {
        changePage('wallet');
    } 
    else if (readSecureCookie('publicKey') && readSecureCookie('encryptedPrivateKey') && unencryptedPrivateKey == null) {
        changePage('password-input');
    }
    else {
        changePage('get-started');
    }
});