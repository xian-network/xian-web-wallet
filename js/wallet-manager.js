// Wallet Manager: maintains a list of wallets and active selection
// - List of wallets (public keys and optional labels) is stored in localStorage under key 'wallets'
// - Each wallet's encrypted private key is stored in secure storage under key `encryptedPrivateKey:<publicKey>`
// - Active wallet uses existing keys: 'publicKey' and 'encryptedPrivateKey'

(function(global){
	const WALLETS_KEY = 'wallets';

	function readWalletList(){
		try {
			const raw = localStorage.getItem(WALLETS_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter(w => typeof w === 'object' && w && typeof w.publicKey === 'string');
		} catch(e){
			return [];
		}
	}

	function writeWalletList(list){
		try {
			localStorage.setItem(WALLETS_KEY, JSON.stringify(list));
		} catch(e) {}
	}

	function ensureUnique(list){
		const seen = new Set();
		const out = [];
		for (const w of list){
			if (!seen.has(w.publicKey)){
				seen.add(w.publicKey);
				out.push({ publicKey: w.publicKey, label: w.label || '' });
			}
		}
		return out;
	}

	async function getActivePublicKey(){
		try { return await readSecureCookie('publicKey'); } catch(e){ return null; }
	}

	function storageKeyForEncrypted(pk){
		return `encryptedPrivateKey:${pk}`;
	}

	const WalletManager = {
		async getWallets(){
			return readWalletList();
		},

		async getActivePublicKey(){
			return await getActivePublicKey();
		},

		addOrUpdateWallet(publicKey, encryptedPrivateKey, label = ''){
			if (!publicKey || !encryptedPrivateKey) return;
			createSecureCookie(storageKeyForEncrypted(publicKey), encryptedPrivateKey, 9999);
			const list = readWalletList();
			const existingIdx = list.findIndex(w => w.publicKey === publicKey);
			if (existingIdx >= 0){
				list[existingIdx].label = label || list[existingIdx].label || '';
			} else {
				list.push({ publicKey, label: label || '' });
			}
			writeWalletList(ensureUnique(list));
		},

		removeWallet(publicKey){
			if (!publicKey) return;
			// remove encrypted key for this wallet
			eraseSecureCookie(storageKeyForEncrypted(publicKey));
			// update list
			const list = readWalletList().filter(w => w.publicKey !== publicKey);
			writeWalletList(list);
		},

		async setActiveWallet(publicKey){
			if (!publicKey) return false;
			const perWalletKey = await readSecureCookie(storageKeyForEncrypted(publicKey));
			if (!perWalletKey) return false;
			createSecureCookie('publicKey', publicKey, 9999);
			createSecureCookie('encryptedPrivateKey', perWalletKey, 9999);
			try { unencryptedPrivateKey = null; } catch(e) {}
			try { locked = true; } catch(e) {}
			return true;
		},

		setLabel(publicKey, label){
			const list = readWalletList();
			const idx = list.findIndex(w => w.publicKey === publicKey);
			if (idx >= 0){
				list[idx].label = label || '';
				writeWalletList(list);
			}
		}
	};

	global.WalletManager = WalletManager;

})(window);


