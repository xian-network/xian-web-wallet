const MAX_ATTEMPTS = 5; // Maximum number of attempts for each transaction
const INTERVAL = 2000; // Interval in milliseconds

async function updateTxHistory() {
    let historyUpdated = false;
    for (const tx of tx_history) {
        if (tx["status"] === "pending") {
            if (!tx.hasOwnProperty("attempts")) {
                tx["attempts"] = 0;
            }
            if (tx["attempts"] >= MAX_ATTEMPTS) {
                tx["status"] = "error";
                historyUpdated = true;
                continue;
            }
            tx["attempts"] += 1;
            try {
                const response = await fetch(`${RPC}/tx?hash=0x${tx["hash"]}`);
                const data = await response.json();
                if (response.status !== 200) {
                    continue;
                }
                if (data["result"]["tx_result"]["code"] === 0) {
                    tx["status"] = "success";
                    toast("success", `Transaction <a class="text-light" style=" text-overflow: ellipsis; width: 5rem; overflow: hidden; text-decoration: underline;margin-left: 0.25rem; " href="`+EXPLORER+`/tx/` + tx["hash"] + `" target="_blank">` + tx["hash"] + `</a> success!`);
                } else {
                    tx["status"] = "error";
                    toast("danger", `Transaction <a class="text-light" style=" text-overflow: ellipsis; width: 5rem; overflow: hidden; text-decoration: underline;margin-left: 0.25rem; " href="`+EXPLORER+`/tx/` + tx["hash"] + `" target="_blank">` + tx["hash"] + `</a> failed`);
                }
                historyUpdated = true;
            } catch (error) {
                
            }
        }
    }
    if (historyUpdated) {
        localStorage.setItem("tx_history", JSON.stringify(tx_history));
        if (app_page == "wallet"){
            changePage("wallet");
        }
    }
}

// Run the updateTxHistory function every couple of seconds
setInterval(updateTxHistory, INTERVAL);
