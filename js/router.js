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
          .then((response) => response.text())
          .then((data) => (app_box.innerHTML = data));
        break;
      case "create-wallet":
        // load html template from templates/create-wallet.html
        fetch("templates/create-wallet.html")
          .then((response) => response.text())
          .then((data) => {
            app_box.innerHTML = data;
            inputValidation();
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
          .then((data) => (app_box.innerHTML = data));
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
          .then((data) => (app_box.innerHTML = data));
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

function inputValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const createWalletError = document.getElementById('createWalletError');

    password.addEventListener("input", checkPasswordLength);
    confirmPassword.addEventListener("input", matchPasswords);

    function checkPasswordLength(event){
        const passwordValue = event.target.value;
        if (passwordValue.length > 0 && passwordValue.length < 6) {
            createWalletError.innerHTML = 'Password must be at least 6 characters long!';
            createWalletError.style.display = 'block';
        } else {
            createWalletError.style.display = 'none';
        }
    }

    function matchPasswords(event){
        const confirmPasswordValue = event.target.value;
        if (password.value !== confirmPasswordValue || confirmPasswordValue === '') {
            createWalletError.innerHTML = 'Passwords do not match!';
            createWalletError.style.display = 'block';
        }else {
            createWalletError.style.display = 'none';
        }
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
