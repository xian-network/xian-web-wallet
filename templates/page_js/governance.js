var isValidator = false;

function getValidatorState() {
    getVariable("masternodes", "nodes")
        .then(validator_list => {
            let built_html = "<span>You are currently ";
            if (validator_list.includes(publicKey)) {
                document.getElementById('new-proposal').style.display = "block";
                isValidator = true;
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
            document.getElementById('validator-state').innerHTML = "<span>ERR getting validator state</span>";
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

async function getProposals() {
    let request = await fetch(RPC + '/abci_query?path="/keys/masternodes.votes"');
    let response = await request.json();
    let votes = JSON.parse(atob(response.result.response.value));
    return votes;
}

async function getProposal(id) {
    let request = await fetch(RPC + '/abci_query?path="/get/masternodes.votes:' + id + '"');
    let response = await request.json();
    let proposal = JSON.parse(atob(response.result.response.value));
    return proposal;
}

async function buildProposalTable() {
    let proposals = await getProposals();
    // reverse the order of the proposals
    proposals = proposals.reverse();
    let proposal_list = document.getElementById("proposal-list");
    let built_html = "";
    for (let proposal of proposals) {
        let proposal_data = await getProposal(proposal);
        if (proposal_data.finalized) {
            continue;
        }
        // if proposal_data.arg is a object, convert it to a json string
        try {
            proposal_data.arg = JSON.stringify(proposal_data.arg);
        } catch (e) {
            // do nothing
        }
        built_html += "<div class='governance-section-wrapper'>";
        built_html += "<div class='governance-section'>";
        built_html += "<h2 class='governance-sub-title'>Proposal #" + proposal + "</h2>";
        built_html += '<p><span class="label-gov">Type of Proposal:</span> <span class="proposed-type-governance value-gov">' + proposal_data.type + '</span></p>';
        built_html += '<p><span class="label-gov">New Value:</span> <span class="proposed-value-governance value-gov">' + proposal_data.arg + '</span></p>';
        built_html += '<p><span class="label-gov">Votes:</span> <span class="proposed-votes-yes value-gov">' + proposal_data.yes + '</span>&nbsp;Yes /&nbsp;<span class="proposed-votes-no value-gov">' + proposal_data.no + '</span>&nbsp;No</p>'
        built_html += "</div>";
        if (isValidator) {
            built_html += '<div class="governance-section-buttons-colored">';
            built_html += '<button class="btn btn-primary vote-yes" data-id="'+proposal+'">Vote Yes</button>';
            built_html += '<button class="btn btn-secondary votes-no" data-id="'+proposal+'">Vote No</button>';
            built_html += "</div>";
        }
        built_html += "</div>";
    }
    proposal_list.innerHTML = built_html;
}


function getRewardPercentages() {
    getVariable("rewards", "S", "value")
        .then(reward_percentages => {
            reward_percentages = JSON.parse(reward_percentages);
            
            document.getElementById("transaction-rewards-validators-governance").innerHTML = parseFloat(reward_percentages[0]["__fixed__"] *100 ? reward_percentages[0]["__fixed__"] : reward_percentages[0] * 100);
            document.getElementById("transaction-rewards-burn-governance").innerHTML = parseFloat(reward_percentages[1]["__fixed__"] * 100 ? reward_percentages[1]["__fixed__"] * 100 : reward_percentages[1] * 100);
            document.getElementById("transaction-rewards-foundation-governance").innerHTML = parseFloat(reward_percentages[2]["__fixed__"] * 100 ? reward_percentages[2]["__fixed__"] * 100 : reward_percentages[2] * 100);
            document.getElementById("transaction-rewards-developers-governance").innerHTML = parseFloat(reward_percentages[3]["__fixed__"] * 100 ? reward_percentages[3]["__fixed__"] * 100 : reward_percentages[3] * 100);
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
buildProposalTable();

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

document.getElementById("new-proposal").addEventListener("click", () => {
    changePage("new-proposal");
});


async function estimateVoteStamps(proposal_id, vote) {
    if (vote) {
        vote = "yes";
    }
    else {
        vote = "no";
    }

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "masternodes",
            function: "vote",
            kwargs: {
                proposal_id: proposal_id,
                vote: vote
            },
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };

    try {
        let signed_tx = await signTransaction(transaction, unencryptedPrivateKey);
        let stamps = await estimateStamps(signed_tx);
        if (stamps === null) {
            document.getElementById('proposalFee').innerHTML = 0;
            return;
        }
        return stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);

    }
}

async function voteProposal(proposal_id, vote) {
    if (vote) {
        vote = "yes";
    }
    else {
        vote = "no";
    }
    let stamps_required = await estimateVoteStamps(proposal_id, vote);
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
     
        
        let transaction = {
            payload: {
                chain_id: CHAIN_ID,
                contract: "masternodes",
                function: "vote",
                kwargs: {
                    proposal_id: proposal_id,
                    vote: vote
                },
                stamps_supplied:  stamps_required + 10
            },
            metadata: {
                signature: "",
            }
        };
        Promise.all([signTransaction(transaction, unencryptedPrivateKey)]).then(signed_tx => {
            let conf = confirm("Are you sure you want to send this transaction?");
            if (!conf) return;
            
            broadcastTransaction(signed_tx).then(response => {
                console.log(response)
                const hash = response['result']['hash'];
                let status = 'success';
                if (response['result']['code'] == 1) {
                    status = 'error';
                }
                
                prependToTransactionHistory(hash, 'masternodes', 'vote', {'proposal_id':proposal_id, 'vote':vote}, status, new Date().toLocaleString());

                setTimeout(() => {
                    buildProposalTable();
                }, 2000);
            });
        });
    }).catch(error => {
        console.error("Error reading secure cookie:", error);
    });
}

document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("vote-yes")) {
        let proposal_id = event.target.dataset.id;
        voteProposal(proposal_id, true);
    }
    if (event.target.classList.contains("vote-no")) {
        let proposal_id = event.target.dataset.id;
        voteProposal(proposal_id, false);
    }
});