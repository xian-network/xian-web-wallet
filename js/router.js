var app_page = "get-started";
var app_box = document.getElementById("app-box");
var publicKey = null;
var unencryptedPrivateKey = null;

function changePage(page, some_data=null) {
    app_page = page;
    switch (app_page) {
      case "get-started":
        // load html template from templates/get-started.html
        fetch("templates/get-started.html")
          .then((response) => response.text())
          .then((data) => (app_box.innerHTML = data));
        break;
      case "create-wallet":
        // load html template from templates/create-wallet.html
        fetch("templates/create-wallet.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
          });
        break;
      case "import-wallet":
        // load html template from templates/import-wallet.html
        fetch("templates/import-wallet.html")
          .then((response) => response.text())
          .then((data) => (app_box.innerHTML = data));
        break;
      case "wallet":
        // load html template from templates/wallet.html
        fetch("templates/wallet.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            loadWalletPage();
          });
        break;
      case "password-input":
        // load html template from templates/password-input.html
        fetch("templates/password-input.html")
          .then((response) => response.text())
          .then((data) => (app_box.innerHTML = data));
        break;
      case "send-token":
        // load html template from templates/send-token.html
        fetch("templates/send-token.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            document.getElementById('tokenName').innerHTML = some_data;
          });
        break;
      case "receive-token":
        // load html template from templates/receive-token.html
        fetch("templates/receive-token.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            loadReceiveTokenPage();
          });
        break;
      case "settings":
        // load html template from templates/settings.html
        fetch("templates/settings.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            loadSettingsPage();
          });
        break;
      case "send-advanced-transaction":
        // load html template from templates/advanced-transaction.html
        fetch("templates/advanced-transaction.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            loadAdvancedTransactionPage();
          });
        break;
      case "add-to-token-list":
        // load html template from templates/add-to-token-list.html
        fetch("templates/add-to-token-list.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            document.getElementById("addTokenSuccess").style.display = "none";
            document.getElementById("addTokenError").style.display = "none";
          });
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
