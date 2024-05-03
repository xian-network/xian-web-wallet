function getValidatorState() {
    let validator_list = getVariable("masternodes", "S", "members");
    let built_html = "<span>You are currently ";
    if (validator_list.includes(publicKey)) {
        built_html += "<span class='text-success'>a Validator</span>";
    }
    else {
        built_html += "<span class='text-danger'>not a Validator</span>";
    }
    built_html += ".</span>";
    document.getElementById('validator-state').innerHTML = built_html;
    document.getElementById('number-of-validators-governance').innerHTML = JSON.parse(validator_list).length;
}

function getDAOBalance() {
    let balance = getVariable("currency", "balances", "dao");
    if (balance === null) {
        balance = "0";
    }
    balance = parseFloat(balance);
    balance = balance.toFixed(8);
    document.getElementById("dao-balance-governance").innerHTML = balance;
}

function getRewardPercentages() {
    let reward_percentages = getVariable("rewards", "S", "value");
    reward_percentages = JSON.parse(reward_percentages);
    document.getElementById("transaction-rewards-validators-governance").innerHTML = parseFloat(reward_percentages[0]["__fixed__"] * 100);
    document.getElementById("transaction-rewards-burn-governance").innerHTML = parseFloat(reward_percentages[1]["__fixed__"] * 100);
    document.getElementById("transaction-rewards-foundation-governance").innerHTML =  parseFloat(reward_percentages[2]["__fixed__"] * 100);
    document.getElementById("transaction-rewards-developers-governance").innerHTML =  parseFloat(reward_percentages[3]["__fixed__"] * 100);
}

getValidatorState();
getDAOBalance();
getRewardPercentages();

 // Get current stamp rate
 getStampRate().then((rate) => {
    if(rate === null) {
        document.getElementById("stamp-rate-governance").innerHTML = "ERR";
        return;
    } 
    document.getElementById("stamp-rate-governance").innerHTML = rate;
}).catch((error) => {
    console.error("Error getting stamp rate:", error.message);
    document.getElementById("stamp-rate-governance").innerHTML = "ERR";
});