function sendAdvTx() {
  let contractName = document.getElementById("contractName").value;
  let functionName = document.getElementById("functionName").value;
  let error = document.getElementById("sendAdvTxError");
  let success = document.getElementById("sendAdvTxSuccess");
  error.style.display = "none";
  success.style.display = "none";
  let args = document.getElementById("adv_args");
  let list_kwargs = document.getElementById("adv_kwargs");
  let kwargs = {};
  let stamps = document.getElementById("stampLimit").value;
  let payload = {
      payload: {
          chain_id: CHAIN_ID,
          contract: contractName,
          function: functionName,
          kwargs: {},
          stamps_supplied: parseInt(stamps)
      },
      metadata: {
          signature: "",
      }
  };
  
  let functionInfo = getContractFunctions(contractName).methods.find(
      (func) => func.name === functionName
  );
  functionInfo.arguments.forEach((arg) => {
      let value = document.getElementById(arg.name).value;
      let expectedType = arg.type;
      if (value === "") {
          error.innerHTML = "All fields are required!";
          error.style.display = "block";
          return;
      }
      if (expectedType === "int") {
          if (isNaN(value)) {
              error.innerHTML = "Invalid value for " + arg.name + "!";
              error.style.display = "block";
              return;
          }
          value = parseInt(value);
      }
      if (expectedType === "float") {
          if (isNaN(value)) {
              error.innerHTML = "Invalid value for " + arg.name + "!";
              error.style.display = "block";
              return;
          }
          value = parseFloat(value);
      }
      if (expectedType === "bool") {
          if (value !== "true" && value !== "false") {
              error.innerHTML = "Invalid value for " + arg.name + "!";
              error.style.display = "block";
              return;
          }
          value = value === "true";
      }
      if (expectedType === "str") {
          value = value.toString();
      }
      if (expectedType === "dict" || expectedType === "list") {
          try {
              value = JSON.parse(value);
          } catch (e) {
              error.innerHTML = "Invalid value for " + arg.name + "!";
              error.style.display = "block";
              return;
          }
      }
      if (expectedType === "Any") {
            try {
                value = JSON.parse(value);
            }
            catch (e) {
                value = value.toString();
            }
        }
      kwargs[arg.name] = value;
  });
  payload.payload.kwargs = kwargs;
  Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
    let conf = confirm("Are you sure you want to send this transaction?");
    if (!conf) return;
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];
    let status = 'success'
    if (response['result']['code'] == 1) {
        status = 'error';
    }
    prependToTransactionHistory(hash, contractName, functionName, kwargs, status, new Date().toLocaleString());

    if (response['result']['code'] == 1) {
        error.innerHTML = response["result"]["log"];
        error.style.display = 'block';
        return;
    }

    else {
        success.innerHTML = 'Transaction sent successfully! Explorer: ' + "<a class='explorer-url' href='https://explorer.xian.org/tx/" + hash + "' target='_blank'>" + hash + "</a>"
        success.style.display = 'block';
    }
  });
}
 
 // Get current stamp rate
 getStampRate().then((rate) => {
        if(rate === null) {
            document.getElementById("stampRate").innerHTML = "ERR";
            return;
        } 
        document.getElementById("stampRate").innerHTML = rate;
    }).catch((error) => {
        console.error("Error getting stamp rate:", error.message);
        document.getElementById("stampRate").innerHTML = "ERR";
    });

 document.getElementById('btn-adv-tx-send').addEventListener('click', function() {
     sendAdvTx();
 });


 function loadAdvancedTransactionPage() {
    document.getElementById("adv_args").style.display = "none";
    document.getElementById("contractName").addEventListener("focusout", function () {
        let contractName = document.getElementById("contractName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        let functionSelect = document.getElementById("functionName");
        let args = document.getElementById("adv_args");
        error.style.display = "none";
        success.style.display = "none";

        let functions = null;
        try {
          functions = getContractFunctions(contractName);
        } catch (e) {
          error.innerHTML = "RPC error!";
          error.style.display = "block";
          return;
        }
        if (functions === null) {
            error.innerHTML = "Contract does not exist!";
            error.style.display = "block";
            functionSelect.innerHTML = "";
            args.style.display = "none";
            return;
        }
        functionSelect.innerHTML = "";
        functionSelect.innerHTML += "<option value=''>Select a function</option>";
        console.log(functions);
        functions.methods.forEach((func) => {
            functionSelect.innerHTML +=
              "<option value='" + func.name + "'>" + func.name + "</option>";
        });
    });

    document.getElementById("functionName").addEventListener("change", function () {
        let contractName = document.getElementById("contractName").value;
        let functionName = document.getElementById("functionName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        error.style.display = "none";
        success.style.display = "none";
        let args = document.getElementById("adv_args");
        let list_kwargs = document.getElementById("adv_kwargs");

        let functions = null;
        try {
          functions = getContractFunctions(contractName);
        } catch (e) {
          error.innerHTML = "RPC error!";
          error.style.display = "block";
          return;
        }
        if (functions !== null) {
            args.style.display = "block";
            let functionInfo = functions.methods.find(
              (func) => func.name === functionName
            );
            list_kwargs.innerHTML = "";
            functionInfo.arguments.forEach((arg) => {
              list_kwargs.innerHTML +=
                `<div class="form-group kwarg-group">
                <label for="` +
                arg.name +
                `">` +
                arg.name +
                `(` +
                arg.type +
                `)</label>
                <input type="text" class="form-control" id="` +
                arg.name +
                `">
            </div>`;
            });
        }
        
    });
}

loadAdvancedTransactionPage();