 // Get current stamp rate
 document.getElementById("stampRate").innerHTML = getStampRate();

 document.getElementById('btn-adv-tx-send').addEventListener('click', function() {
     sendAdvTx();
 });

 document.getElementById('btn-adv-tx-ide').addEventListener('click', function() {
     changePage('ide');
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