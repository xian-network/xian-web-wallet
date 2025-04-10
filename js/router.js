var app_page = "get-started";
var app_box = document.getElementById("app-box");
var publicKey = "";
var unencryptedPrivateKey = null;
var locked = true;
var tx_history = JSON.parse(localStorage.getItem("tx_history")) || [];
var sendResponse = null;
var externalWindow = null;

var callbacks = {};
var callbackId = 0;

function popup_params(width, height) {
  var a = typeof window.screenX != 'undefined' ? window.screenX : window.screenLeft;
  var i = typeof window.screenY != 'undefined' ? window.screenY : window.screenTop;
  var g = typeof window.outerWidth!='undefined' ? window.outerWidth : document.documentElement.clientWidth;
  var f = typeof window.outerHeight != 'undefined' ? window.outerHeight: (document.documentElement.clientHeight - 22);
  var h = (a < 0) ? window.screen.width + a : a;
  var left = parseInt(h + ((g - width) / 2), 10);
  var top = parseInt(i + ((f-height) / 2.5), 10);
  return 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=1';
}   

function createExternalWindow(page, some_data = null, send_response = null) {
  const loadHtmlAndScripts = (htmlPath) => {
    fetch(htmlPath)
      .then((response) => response.text())
      .then((htmlContent) => {
        if (!externalWindow || externalWindow.closed) {
          externalWindow = window.open("index-external.html", "", "width=400,height=600" + popup_params(400, 600));
          externalWindow.onload = () => {
            externalWindow.postMessage({
              type: "HTML",
              html: htmlContent
            }, "*");
            sendInitialState();
            sendPageSpecificMessage(page, some_data);
          };
        } else {
          externalWindow.postMessage({
            type: "HTML",
            html: htmlContent
          }, "*");
          sendInitialState();
          sendPageSpecificMessage(page, some_data);
        }
      });
  };

  const sendInitialState = () => {
    externalWindow.postMessage({
      type: "INITIAL_STATE",
      state: { publicKey, unencryptedPrivateKey, locked, tx_history }
    }, "*");
  };

  const sendPageSpecificMessage = (page, some_data) => {
    const callbackKey = 'callback_' + (callbackId++);
    callbacks[callbackKey] = send_response;
    let type = "";
    if (page === "request-transaction") {
      type = "REQUEST_TRANSACTION";
    } else if (page === "request-signature") {
      type = "REQUEST_SIGNATURE";
    }
    else if (page === "request-token") {
      type = "REQUEST_TOKEN";
    }
    externalWindow.postMessage({
      type: type,
      data: JSON.parse(JSON.stringify(some_data)),
      callbackKey: callbackKey
    }, "*");
  };

  switch (page) {
    case "request-transaction":
      loadHtmlAndScripts("templates/request-transaction.html");
      break;
    case "request-signature":
      loadHtmlAndScripts("templates/request-signature.html");
      break;
    case "request-token":
      loadHtmlAndScripts("templates/request-token.html");
      break;
    default:
      break;
  }
}

window.addEventListener("message", (event) => {
  if (event.data.type === "REQUEST_TRANSACTION") {
    const some_data = event.data.data;
    const callbackKey = event.data.callbackKey;
    callbacks[callbackKey](event.data.data);
    tx_history = JSON.parse(localStorage.getItem("tx_history")) || [];
    if (app_page == "wallet"){
      changePage("wallet");
  }
  }
  if (event.data.type === "REQUEST_SIGNATURE") {
    const some_data = event.data.data;
    const callbackKey = event.data.callbackKey;
    callbacks[callbackKey](event.data.data);
    toast('success', 'Successfully signed message');
  }
  if (event.data.type === "REQUEST_TOKEN") {
    const some_data = event.data.data;
    const callbackKey = event.data.callbackKey;
    callbacks[callbackKey](event.data.data);
    token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];
    if (app_page == "wallet"){
      changePage("settings");
    }
  }
});

function sideNavActive() {
  try {
    if (app_page === "wallet") {
      document.getElementById("side-change-page-wallet").classList.add("active-side-nav");
      document.getElementById("side-change-page-ide").classList.remove("active-side-nav");
      document.getElementById("side-change-page-insights").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.remove("active-side-nav");
      document.getElementById("side-change-page-settings").classList.remove("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.remove("active-side-nav");
    }
    else if (app_page === "ide") {
      document.getElementById("side-change-page-wallet").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ide").classList.add("active-side-nav");
      document.getElementById("side-change-page-insights").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.remove("active-side-nav");
      document.getElementById("side-change-page-settings").classList.remove("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.remove("active-side-nav");
    }
    else if (app_page === "insights") {
      document.getElementById("side-change-page-wallet").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ide").classList.remove("active-side-nav");
      document.getElementById("side-change-page-insights").classList.add("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.remove("active-side-nav");
      document.getElementById("side-change-page-settings").classList.remove("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.remove("active-side-nav");
    }
    else if (app_page === "ecosystem-news") {
      document.getElementById("side-change-page-wallet").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ide").classList.remove("active-side-nav");
      document.getElementById("side-change-page-insights").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.add("active-side-nav");
      document.getElementById("side-change-page-settings").classList.remove("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.remove("active-side-nav");
    }
    else if (app_page === "settings") {
      document.getElementById("side-change-page-wallet").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ide").classList.remove("active-side-nav");
      document.getElementById("side-change-page-insights").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.remove("active-side-nav");
      document.getElementById("side-change-page-settings").classList.add("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.remove("active-side-nav");
    }
    else if (app_page === "messenger") {
      document.getElementById("side-change-page-wallet").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ide").classList.remove("active-side-nav");
      document.getElementById("side-change-page-insights").classList.remove("active-side-nav");
      document.getElementById("side-change-page-ecosystem-news").classList.remove("active-side-nav");
      document.getElementById("side-change-page-settings").classList.remove("active-side-nav");
      document.getElementById("side-change-page-messenger").classList.add("active-side-nav");
    }
    
  } catch (error) {
    console.log(error);
  }
}

function changePage(page, some_data = null, send_response = null) {
  sendEventGA("page_view", {engagement_time_msec: 100, page_title: page, page_location: page});
  app_page = page;
  sideNavActive();
  const loadHtmlAndScripts = (htmlPath) => {
    fetch(htmlPath)
      .then((response) => response.text())
      .then((htmlContent) => insertHTMLAndExecuteScripts(app_box, htmlContent))
      .then(() => {
        if (page === "send-token")
          document.getElementById("tokenName").innerHTML = some_data;
        else if (page === "request-transaction") {
          document.getElementById("requestTransactionContract").innerHTML =
            some_data["data"]["contract"];
          document.getElementById("requestTransactionFunction").innerHTML =
            some_data["data"]["method"];
          document.getElementById("requestTransactionParams").innerHTML =
            JSON.stringify(some_data["data"]["kwargs"]);
          document.getElementById("requestTransactionStampLimit").innerHTML =
            some_data["data"]["stampLimit"];
            sendResponse = send_response;
        }
        else if(page === "request-signature"){
          document.getElementById("requestSignatureMessage").innerHTML = some_data["data"]["message"];
          sendResponse = send_response;
        }
        else if (page === "request-token") {
          document.getElementById("requestTokenMessage").innerHTML = some_data;
          sendResponse = send_response;
        }
        else if (page === "password-input" || page === "create-wallet" || page === "import-wallet" || page === "get-started") {
          document.getElementsByClassName("side-nav")[0].style.display = "none";
          if (window.innerWidth > 768) {
            document.getElementsByClassName("app-box")[0].style.borderTopLeftRadius = "8px";
            document.getElementsByClassName("app-box")[0].style.borderBottomLeftRadius = "8px";
           
          }
          else{
            document.getElementsByClassName("app-box")[0].style.borderTopLeftRadius = "8px";
            document.getElementsByClassName("app-box")[0].style.borderTopRightRadius = "8px";
          }
          document.getElementsByClassName("app-box")[0].style.borderLeftWidth = "1px";
        }
        else{
          document.getElementsByClassName("side-nav")[0].style.display = "flex";
          if (window.innerWidth > 768) {
            document.getElementsByClassName("app-box")[0].style.borderLeftWidth = "0px";
           
            document.getElementsByClassName("app-box")[0].style.borderTopLeftRadius = "0px";
            document.getElementsByClassName("app-box")[0].style.borderTopRightRadius = "8px";
            document.getElementsByClassName("app-box")[0].style.borderBottomLeftRadius = "0px";
            document.getElementsByClassName("side-nav")[0].style.borderBottomLeftRadius = "8px";
            document.getElementsByClassName("side-nav")[0].style.borderTopRightRadius = "0px";
            document.getElementsByClassName("side-nav")[0].style.borderBottomWidth = "1px";
          }
          else{
            document.getElementsByClassName("app-box")[0].style.borderTopLeftRadius = "0px";
            document.getElementsByClassName("app-box")[0].style.borderTopRightRadius = "0px";
            document.getElementsByClassName("app-box")[0].style.borderBottomLeftRadius = "8px";
            document.getElementsByClassName("app-box")[0].style.borderLeftWidth = "1px";
            document.getElementsByClassName("side-nav")[0].style.borderTopRightRadius = "8px";
            document.getElementsByClassName("side-nav")[0].style.borderBottomLeftRadius = "0px";
            document.getElementsByClassName("side-nav")[0].style.borderBottomWidth = "0px";
          }
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
    case "request-transaction":
      loadHtmlAndScripts("templates/request-transaction.html");
      break;
    case "insights":
      loadHtmlAndScripts("templates/insights.html");
      break;
    case "new-proposal":
      loadHtmlAndScripts("templates/new-proposal.html");
      break;
    case "request-signature":
      loadHtmlAndScripts("templates/request-signature.html");
      break;
    case "ecosystem-news":
      loadHtmlAndScripts("templates/ecosystem-news.html");
      break;
    case "create-token":
      loadHtmlAndScripts("templates/create-token.html");
      break;
    case "messenger":
      loadHtmlAndScripts("templates/messenger.html");
      break;
    default:
      break;
  }
}

function insertHTMLAndExecuteScripts(container, htmlContent) {
  container.innerHTML = htmlContent;
  const scripts = container.querySelectorAll("script");

  // Identify and remove previously loaded scripts to prevent duplicates
  const oldScripts = document.querySelectorAll('script[data-script="dynamic"]');
  oldScripts.forEach(script => script.remove());

  scripts.forEach((originalScript) => {
    if (originalScript.src) {
      const script = document.createElement("script");
      script.src = originalScript.src;
      script.setAttribute('data-script', 'dynamic'); // Mark script for identification
      script.onload = () => {
        console.log(`Script loaded: ${script.src}`);
      };
      document.head.appendChild(script);
    } else {
      console.warn("Inline script execution is blocked by CSP");
    }
  });
}


document.addEventListener("DOMContentLoaded", (event) => {
  if (document.getElementById("onlineStatus") == null) {
    return;
  }
  let online_status_element = document.getElementById("onlineStatus");

  ping().then(online_status => {
        
        if (!online_status) {
            online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
        }
        else {
            online_status_element.innerHTML = "<div class='mt-1px'><div class='online-circle' title='Node is Online'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
        }
        }).catch(error => {
        online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
    });

    getChainID().then(chain_id => {
      CHAIN_ID = chain_id;
  });

  Promise.all([
    readSecureCookie("publicKey"),
    readSecureCookie("encryptedPrivateKey"),
  ]).then((values) => {
  if (
    values[0] &&
    values[1] &&
    unencryptedPrivateKey != null
  ) {
    changePage("wallet");
  } else if (
    values[0] &&
    values[1] &&
    unencryptedPrivateKey == null
  ) {
    changePage("password-input");
  } else {
    changePage("get-started");
  }
  });

});