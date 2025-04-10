var callbackKey = null;
window.addEventListener("message", (event) => {
    console.log(event.data);
    if (event.data.type === "HTML") {
      insertHTMLAndExecuteScripts(document.getElementById("app-box"), event.data.html);
    }
    if (event.data.type === "INITIAL_STATE") {
      publicKey = event.data.state.publicKey;
      unencryptedPrivateKey = event.data.state.unencryptedPrivateKey;
      locked = event.data.state.locked;
      tx_history = event.data.state.tx_history;
    }
    if (event.data.type === "REQUEST_TRANSACTION") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      document.getElementById("requestTransactionContract").innerHTML = some_data["data"]["contract"];
      document.getElementById("requestTransactionFunction").innerHTML = some_data["data"]["method"];
      document.getElementById("requestTransactionParams").innerHTML = JSON.stringify(some_data["data"]["kwargs"]);
      document.getElementById("requestTransactionStampLimit").innerHTML = some_data["data"]["stampLimit"];
      document.getElementById("requestTransactionChainId").innerHTML = some_data["data"]["chainId"];
    }
    if (event.data.type === "REQUEST_SIGNATURE") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      document.getElementById("requestSignatureMessage").innerHTML = some_data["data"]["message"];
    }
    if (event.data.type === "REQUEST_TOKEN") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      document.getElementById("requestTokenMessage").innerHTML = some_data["data"]["contract"];
      getTokenInfo(some_data["data"]["contract"]).then(token_info => {
        document.getElementById("requestTokenName").innerHTML = token_info.name;
        document.getElementById("requestTokenSymbol").innerHTML = token_info.symbol;
      });
    }
  });