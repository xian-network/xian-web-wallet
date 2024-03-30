// Description: This file contains the code to handle the communication between the DApp and the wallet.
// The DApp is a web application that runs in a window that was opened by the wallet using window.open and a URL that points to the DApp.

// The DApp sends messages to the wallet using window.postMessage method of the wallet window element. (use window.opener.postMessage)
// The wallet listens for these messages using window.addEventListener.

// The wallet can send messages to the DApp using the postMessage method of the dapp window element.
// The DApp listens for these messages using window.addEventListener.
// All messages are JSON strings that have to be parsed using JSON.parse.

// The DApp can send two types of messages to the wallet:
// The request message types are:
// {
//   type: "requestWalletAddress",
//   data: {},
// }
//
// {
//   type: "requestTransaction",
//   data: {
//     contract: "currency",
//     method: "transfer",
//     kwargs: {
//       amount: 1,
//       to: "292b346779dca86b8ffb979f48b590ea04c2d49d9fb505af9d6aa7e044a45269",
//     },
//     stampLimit: 50,
//   },
// }

// The wallet can send two types of messages to the DApp:
// The response message types are:
// {
//   type: "responseWalletAddress",
//   data: {
//     address: "292b346779dca86b8ffb979f48b590ea04c2d49d9fb505af9d6aa7e044a45269",
//     locked: false || true,
//   },
// }
//
// {
//   type: "responseTransaction",
//   data: {
//     txid: "292b346779dca86b8ffb979f48b590ea04c2d49d9fb505af9d6aa7e044a45269",
//     status: "rejected" || "sent" || "error" || "locked_wallet",
//   },
// }
var current_request_event = null;
window.addEventListener("message", receiveRequest, false);

function receiveRequest(event) {
  if (event.source) {
    handleRequest(event);
  }
}

function handleRequest(request_event) {
    let request = null;
    try {
        request = JSON.parse(request_event.data);
    }
    catch (e) {
        return;
    }
    let response = {};
    switch (request.type) {
        case "requestWalletAddress":
            readSecureCookie("publicKey").then((publicKey) => {
                response = {
                    type: "responseWalletAddress",
                    data: {
                        address: publicKey,
                        locked: locked,
                    },
                };
                response = JSON.stringify(response);
                request_event.source.postMessage(response, request_event.origin);
            });
        case "requestTransaction":
            // Check if all expected fields are present
            if (!request.data.contract || !request.data.method || !request.data.kwargs || !request.data.stampLimit) {
                response = {
                    type: "responseTransaction",
                    data: {
                        txid: null,
                        status: "error",
                    },
                };
                response = JSON.stringify(response);
                request_event.source.postMessage(response, request_event.origin);
                break;
            }
            // Check if the wallet is locked
            if (locked) {
                response = {
                    type: "responseTransaction",
                    data: {
                        txid: null,
                        status: "locked_wallet",
                    },
                };
                response = JSON.stringify(response);
                request_event.source.postMessage(response, request_event.origin);
                break;
            }
            changePage("request", { "event": request_event, "data": request.data });
            current_request_event = request_event;
            break;
        default:
            break;
    }
}
