## Xian Web Wallet – AI Coding Assistant Guide

Focus: Chrome extension + serverless web app for Xian network key management, tx signing, token ops, light IDE (Pyodide) and dApp integration. No backend; everything is client/browser local.

### Core Architecture
1. Entry surfaces:
   - `index.html` (main app) and `index-external.html` (popup request window container).
   - Extension service worker: `background.js` (tab management + message relay).
   - `content.js` bridges dApp page events <-> extension runtime messages.
2. Page system: `js/router.js` dynamically fetches HTML from `templates/*.html`, injects into `#app-box`, then loads any `<script src>` tags (inline scripts intentionally blocked by CSP). State: `app_page`, `publicKey`, `unencryptedPrivateKey`, `locked`, `tx_history`.
3. Per‑page logic: `templates/page_js/*.js` files are referenced by individual template HTML files (do not assume bundling). When adding a new view: create `templates/<page>.html` + optional `templates/page_js/<page>.js` and extend `switch` in `changePage` (router).
4. Wallet/key management: `js/wallet-manager.js` maintains wallet list in `localStorage` (`wallets`) and encrypted private keys in secure cookies (`encryptedPrivateKey:<publicKey>`). Active wallet cookies: `publicKey`, `encryptedPrivateKey`. Global flags `locked`, `unencryptedPrivateKey` govern access.
5. Crypto offload: `js/crypto-worker-manager.js` orchestrates `js/workers/crypto-worker.js` (NaCl via `providers/nacl.js`). Provides async wrappers (suffix `Async`) that fallback to main thread helpers if worker fails.
6. Python/IDE: `js/workers/pyodide-worker.js` loads Pyodide + linter wheel (`python3-dist/...whl`) for contract linting. Messages: `INIT`, `LINT_CODE`, `RUN_PYTHON`.
7. External request windows: `router.createExternalWindow()` opens `index-external.html` and posts templated HTML + INITIAL_STATE + request-specific message (`REQUEST_TRANSACTION`, `REQUEST_SIGNATURE`, `REQUEST_TOKEN`) using `postMessage` with callback bookkeeping (`callbacks` map).

### Messaging & Integration Flows
- dApp -> content script: dispatch DOM events (`xianWalletGetInfo`, `xianWalletSendTx`, etc.).
- Content script -> background: `chrome.runtime.sendMessage({type: 'getWalletInfo'|...})`.
- Background -> app tab: forwards same `message.type` to the tab (`chrome.tabs.sendMessage`).
- In-app JS (not shown here) receives and triggers `changePage("request-transaction"|...)` which may open an external window for user approval.
- External window <-> main app: `window.postMessage` with `type` field. Approval callbacks resolved via `callbackKey`.

### Storage & State Conventions
- Persistent: `localStorage`: `wallets`, `tx_history`, `token_list`.
- Secure-ish: cookies via helper functions (not shown here) for `publicKey`, `encryptedPrivateKey`, and per-wallet encrypted keys (`encryptedPrivateKey:<publicKey>`).
- In‑memory: `unencryptedPrivateKey` only after password unlock; resets on wallet switch.
- Always update UI lock state by toggling `locked` and calling `updateNavActionsVisibility()` after relevant state changes.

### Deterministic Signing Pattern
- Transactions: before signing, payload keys are sorted alphabetically (see worker `signTransaction`) to ensure stable signature.
- Signing populates `transaction.payload.sender`, `nonce`, then sets `transaction.metadata.signature`.
- For main-thread fallback, `signTransactionAsync` mirrors this (ensure you replicate ordering if you add new pre-sign fields).

### Adding New Crypto Ops
- Extend `crypto-worker.js`: add case in `switch(type)` producing `{id,type:'SUCCESS',data}`.
- Mirror with a method in `CryptoWorkerManager` + wrapper function (suffix `Async`). Keep 10s timeout pattern; reject with informative errors.

### Adding New Pages / Flows
1. Create HTML in `templates/`. Use only external `<script src="templates/page_js/<page>.js">` tags (no inline JS; CSP restricts this).
2. Add optional logic file under `templates/page_js/` keeping page-specific DOM handling there (avoid bloating `router.js`).
3. Update `changePage` switch to map `app_page` to new template path and any post-load data binding.
4. If an approval-style popup is needed, extend `createExternalWindow` switch + external message type constants.

### External Request Pattern Example
```
createExternalWindow('request-signature', { data: { message: 'hello' } }, (resp) => { /* handle signed */ });
```
Worker posts back via `postMessage({type:'REQUEST_SIGNATURE', data, callbackKey})`, main window matches `callbacks[callbackKey]`.

### Pyodide Usage Notes
- Lazy init guarded by `initializationPromise` to prevent duplicate loads.
- Linting wraps `lint_code` from the installed wheel; multiline user code is interpolated—sanitize or escape if introducing new inputs.

### Performance / Safety Guidelines
- Heavy cryptography: always prefer `*Async` wrappers to avoid main-thread stalls.
- Do not introduce inline `<script>` into templates; CSP blocks them.
- Keep new global variables minimal; prefer module-scoped helpers in added files.
- When persisting new structured data in `localStorage`, namespace keys clearly (e.g., `xian_<feature>_v1`).

### When Modifying Router
- Keep `changePage` side-effects (DOM class/radius adjustments) consistent; test both mobile (<768) and desktop branches.
- After state-affecting operations (unlock, tx submit), consider calling `changePage('wallet')` or reloading current page to refresh dynamic sections.

### Quick Reference
- Page templates: `templates/*.html`
- Page scripts: `templates/page_js/*.js`
- Core logic: `js/router.js`, `js/wallet-manager.js`, `js/crypto-worker-manager.js`
- Workers: `js/workers/*.js`
- Extension surfaces: `background.js`, `content.js`

### Do / Avoid
- DO reuse existing message type patterns (`REQUEST_*`, `dApp*`).
- DO maintain deterministic payload ordering before signing.
- AVOID storing raw private keys outside memory; never persist `unencryptedPrivateKey`.
- AVOID blocking UI with synchronous crypto or Python calls.

---
Feedback welcome: identify unclear workflows (e.g., tx approval callbacks, adding lint modes) and we can refine.
