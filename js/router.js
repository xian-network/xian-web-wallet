var app_page = "get-started";
var app_box = document.getElementById("app-box");
var publicKey = null;
var unencryptedPrivateKey = null;
var locked = true;

function changePage(page, some_data = null) {
  app_page = page;
  const loadHtmlAndScripts = (htmlPath) => {
    fetch(htmlPath)
      .then((response) => response.text())
      .then((htmlContent) => insertHTMLAndExecuteScripts(app_box, htmlContent))
      .then(() => {
        if (page === "wallet") loadWalletPage();
        else if (page === "receive-token") loadReceiveTokenPage();
        else if (page === "settings") loadSettingsPage();
        else if (page === "send-advanced-transaction")
          loadAdvancedTransactionPage();
        else if (page === "send-token")
          document.getElementById("tokenName").innerHTML = some_data;
        else if (page === "add-to-token-list") {
          document.getElementById("addTokenSuccess").style.display = "none";
          document.getElementById("addTokenError").style.display = "none";
        } else if (page === "request") {
          document.getElementById("requestFrom").innerHTML =
            some_data["event"].origin;
          document.getElementById("requestFrom2").innerHTML =
            some_data["event"].origin;
          document.getElementById("contractRequest").innerHTML =
            some_data["data"]["contract"];
          document.getElementById("methodRequest").innerHTML =
            some_data["data"]["method"];
          document.getElementById("kwargsRequest").innerHTML =
            JSON.stringify(some_data["data"]["kwargs"]);
          document.getElementById("stampLimitRequest").innerHTML =
            some_data["data"]["stampLimit"];
        }
      });
  };

  switch (app_page) {
    case "get-started":
      loadHtmlAndScripts("templates/get-started.html");
      break;
    case "create-wallet":
      loadHtmlAndScripts("templates/create-wallet.html");
      break;
    case "import-wallet":
      loadHtmlAndScripts("templates/import-wallet.html");
      break;
    case "wallet":
      loadHtmlAndScripts("templates/wallet.html");
      break;
    case "password-input":
      loadHtmlAndScripts("templates/password-input.html");
      break;
    case "send-token":
      loadHtmlAndScripts("templates/send-token.html");
      break;
    case "receive-token":
      loadHtmlAndScripts("templates/receive-token.html");
      break;
    case "settings":
      loadHtmlAndScripts("templates/settings.html");
      break;
    case "send-advanced-transaction":
      loadHtmlAndScripts("templates/advanced-transaction.html");
      break;
    case "add-to-token-list":
      loadHtmlAndScripts("templates/add-to-token-list.html");
      break;
    case "ide":
      loadHtmlAndScripts("templates/ide.html");
      break;
    case "request":
      loadHtmlAndScripts("templates/request.html");
      break;
    default:
      break;
  }
}

function insertHTMLAndExecuteScripts(container, htmlContent) {
  container.innerHTML = htmlContent;
  const scripts = container.querySelectorAll("script");
  scripts.forEach((originalScript) => {
    const script = document.createElement("script");
    if (originalScript.src) {
      script.src = originalScript.src;
    } else {
      script.textContent = originalScript.textContent;
    }
    document.head.appendChild(script).parentNode.removeChild(script);
  });
}

document.addEventListener("DOMContentLoaded", (event) => {
  if (
    readSecureCookie("publicKey") &&
    readSecureCookie("encryptedPrivateKey") &&
    unencryptedPrivateKey != null
  ) {
    changePage("wallet");
  } else if (
    readSecureCookie("publicKey") &&
    readSecureCookie("encryptedPrivateKey") &&
    unencryptedPrivateKey == null
  ) {
    changePage("password-input");
  } else {
    changePage("get-started");
  }
});
