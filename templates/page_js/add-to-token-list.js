function addToken() {
  let successMsg = document.getElementById("addTokenSuccess");
  let errorMsg = document.getElementById("addTokenError");
  let btnAddToken = document.getElementById("btn-add-token-add");
  document.getElementById("addTokenSuccess").style.display = "none";
  document.getElementById("addTokenError").style.display = "none";
  let contractNameAddToken = document.getElementById("contractNameAddToken").value;

  // only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]*$/.test(contractNameAddToken)) {
      errorMsg.style.display = "block";
      errorMsg.innerHTML = "Invalid contract name!";
      return;
  }

  btnAddToken.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Adding Token";


  getTokenInfo(contractNameAddToken)
      .then(token_info => {
          if (token_info.name === "\x9Eée" || token_info.symbol === "\x9Eée") {
              errorMsg.style.display = "block";
              errorMsg.innerHTML = "Token does not exist!";
              btnAddToken.innerHTML = "Add Token";
              return;
          }
          if(token_info.name === undefined || token_info.symbol === undefined){
              errorMsg.style.display = "block";
              errorMsg.innerHTML = "Error retrieving token info!";
              btnAddToken.innerHTML = "Add Token";
              return;
          }

          if (!token_list.includes(contractNameAddToken)) {
              token_list.push(contractNameAddToken);
              localStorage.setItem("token_list", JSON.stringify(token_list));
              successMsg.style.display = "block";
              successMsg.innerHTML = "Token added successfully!";
              btnAddToken.innerHTML = "Add Token";
          } else {
              errorMsg.style.display = "block";
              errorMsg.innerHTML = "Token already exists!";
              btnAddToken.innerHTML = "Add Token";
          }
      })
      .catch(error => {
          errorMsg.style.display = "block";
          errorMsg.innerHTML = "Error retrieving token info: " + error.message;
          btnAddToken.innerHTML = "Add Token";
      });
}
  
document.getElementById('btn-add-token-add').addEventListener('click', function() {
    addToken();
});
document.getElementById('btn-add-token-cancel').addEventListener('click', function() {
    goToWallet();
});