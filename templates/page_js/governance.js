function getValidatorState() {
    getVariable("masternodes", "S", "members")
        .then(validator_list => {
            let built_html = "<span>You are currently ";
            if (validator_list.includes(publicKey)) {
                built_html += "<span class='text-success'>a Validator</span>";
            } else {
                built_html += "<span class='text-danger'>not a Validator</span>";
            }
            built_html += ".</span>";
            document.getElementById('validator-state').innerHTML = built_html;
            document.getElementById('number-of-validators-governance').innerHTML = JSON.parse(validator_list).length;
        })
        .catch(error => {
            console.error("Error getting validator state:", error);
            document.getElementById('validator-state').innerHTML = "<span>ERR</span>";
            document.getElementById('number-of-validators-governance').innerHTML = "ERR";
        });
}

function getDAOBalance() {
    getVariable("currency", "balances", "dao")
        .then(balance => {
            if (balance === null) {
                balance = "0";
            }
            balance = parseFloat(balance).toFixed(8);
            document.getElementById("dao-balance-governance").innerHTML = balance;
        })
        .catch(error => {
            console.error("Error getting DAO balance:", error);
            document.getElementById("dao-balance-governance").innerHTML = "ERR";
        });
}

function getRewardPercentages() {
    getVariable("rewards", "S", "value")
        .then(reward_percentages => {
            reward_percentages = JSON.parse(reward_percentages);
            document.getElementById("transaction-rewards-validators-governance").innerHTML = parseFloat(reward_percentages[0]["__fixed__"] * 100);
            document.getElementById("transaction-rewards-burn-governance").innerHTML = parseFloat(reward_percentages[1]["__fixed__"] * 100);
            document.getElementById("transaction-rewards-foundation-governance").innerHTML = parseFloat(reward_percentages[2]["__fixed__"] * 100);
            document.getElementById("transaction-rewards-developers-governance").innerHTML = parseFloat(reward_percentages[3]["__fixed__"] * 100);
        })
        .catch(error => {
            console.error("Error getting reward percentages:", error);
            document.getElementById("transaction-rewards-validators-governance").innerHTML = "ERR";
            document.getElementById("transaction-rewards-burn-governance").innerHTML = "ERR";
            document.getElementById("transaction-rewards-foundation-governance").innerHTML = "ERR";
            document.getElementById("transaction-rewards-developers-governance").innerHTML = "ERR";
        });
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