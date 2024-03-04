# Xian Web Wallet

[![CodeQL](https://github.com/crosschainer/xian-web-wallet/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/crosschainer/xian-web-wallet/actions/workflows/github-code-scanning/codeql)

Available at https://wallet.xian.org

## Introduction
Xian Web Wallet is a cutting-edge, serverless web application tailored for secure wallet management and cryptographic keypair generation, utilizing advanced client-side JavaScript. It introduces wallet features, moving beyond keypair management to a comprehensive wallet solution. By incorporating encrypted private key and public key storage in cookies for enhanced security, it ensures user privacy and security without compromising convenience. Xian Web Wallet represents a significant leap in web-based cryptocurrency management, offering a seamless experience for managing wallet contents and cryptographic assets.

## Features
- **Wallet Management**: Intuitive interface for managing your cryptocurrency wallet, including sending and receiving transactions.
- **Serverless Architecture**: Operates entirely on the client-side, simplifying deployment and eliminating the need for server-side infrastructure.
- **Enhanced Security Measures**: Utilizes encrypted cookies for storing public and encrypted private keys, ensuring higher security standards.
- **Secure Key Management**: Securely generates and manages Xian keypairs with robust encryption techniques.
- **User-Friendly Security**: Key management is safeguarded with password protection, leveraging user-defined passwords for an additional layer of security.

## Getting Started

### Prerequisites
- A web server with HTTPS cert
- A node that you are allowed to connect to (CORS)

### Installation
Deploying Xian Web Wallet is straightforward due to its serverless nature. Simply host it on any web server to get started.

```
git clone https://github.com/crosschainer/xian-web-wallet.git
cd xian-web-wallet
open index.html
```

## Security
Security and privacy are paramount in Xian Web Wallet:
- Executes all cryptographic functions client-side, ensuring private keys never leave the user's device.
- Stores keypairs in encrypted cookies, further enhancing security and privacy.
- It's recommended to use a strong, unique password for your wallet and ensure your device is secure against unauthorized access.

## Contributions
We warmly welcome contributions to Xian Web Wallet. To contribute, fork the repository, make your changes, and submit a pull request.

## Disclaimer
Xian Web Wallet is offered "as is", with no warranties. Users should use it at their own risk, understanding the inherent responsibilities of managing cryptographic assets.