function addToken() {
    let successMsg = document.getElementById("addTokenSuccess");
    let errorMsg = document.getElementById("addTokenError");
    document.getElementById("addTokenSuccess").style.display = "none";
    document.getElementById("addTokenError").style.display = "none";
    let contractNameAddToken = document.getElementById(
      "contractNameAddToken"
    ).value;
    // only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]*$/.test(contractNameAddToken)) {
      errorMsg.style.display = "block";
      errorMsg.innerHTML = "Invalid contract name!";
      return;
    }
    let token_info = null;
    try {
      token_info = getTokenInfo(contractNameAddToken);
    } catch (e) {
      errorMsg.style.display = "block";
      errorMsg.innerHTML = "RPC error!";
      return;
    }
    if (token_info.name === null || token_info.symbol === null) {
      errorMsg.style.display = "block";
      errorMsg.innerHTML = "Token does not exist!";
      return;
    }
    if (!token_list.includes(contractNameAddToken)) {
      token_list.push(contractNameAddToken);
      localStorage.setItem("token_list", JSON.stringify(token_list));
      successMsg.style.display = "block";
      successMsg.innerHTML = "Token added successfully!";
    } else {
      errorMsg.style.display = "block";
      errorMsg.innerHTML = "Token already exists!";
    }
  }
  
document.getElementById('btn-add-token-add').addEventListener('click', function() {
    addToken();
});
document.getElementById('btn-add-token-cancel').addEventListener('click', function() {
    goToWallet();
});