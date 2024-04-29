# Xian Web Wallet & Extension

Available at https://wallet.xian.org

Or just load it as a Browser Extension!

## Introduction
Xian Web Wallet is a cutting-edge, serverless web application tailored for secure wallet management and cryptographic keypair generation, utilizing advanced client-side JavaScript.

## Features
- **Wallet Management**: Intuitive interface for managing your cryptocurrency wallet, including sending and receiving transactions.
- **Serverless Architecture**: Operates entirely on the client-side, simplifying deployment and eliminating the need for server-side infrastructure.
- **Secure Key Management**: Securely generates and manages Xian keypairs with robust encryption techniques.

## Getting Started

### Prerequisites
As Website
- A web server with HTTPS cert
- A node that you are allowed to connect to (CORS)


As Extension
- Load the folder as an unpacked extension

## Security
Security and privacy are paramount in Xian Web Wallet:
- Executes all cryptographic functions client-side, ensuring private keys never leave the user's device.
- Important Keys are encrypted
- It's recommended to use a strong, unique password for your wallet and ensure your device is secure against unauthorized access.

## dApp Integration
**Only for Extension**

Request Wallet Information
```javascript
// Listen for wallet info
document.addEventListener('xianWalletInfo', function(event) {
    console.log(event.detail); // { address: 'wallet_address', locked: true/false, chainId: 'chainId_of_wallet' }
});

// Request wallet info
document.dispatchEvent(new CustomEvent('xianWalletGetInfo'));
```

Request Transaction
```javascript
// Listen for transaction response
document.addEventListener('xianWalletTxStatus', function(event) {
    console.log(event.detail); // { status: 'sent', txid: 'transaction_id' } or { errors: []}
});

// Request transaction
document.dispatchEvent(new CustomEvent('xianWalletSendTx', {
    detail:
        {
            contract:"currency", 
            method:"transfer", 
            kwargs:{
                "to":"wallet_address",
                "amount":1000
            }, 
            stampLimit:30
        }
    }
));
```



## Contributions
We warmly welcome contributions to Xian Web Wallet. To contribute, fork the repository, make your changes, and submit a pull request.

## Disclaimer
Xian Web Wallet is offered "as is", with no warranties. Users should use it at their own risk, understanding the inherent responsibilities of managing cryptographic assets.
