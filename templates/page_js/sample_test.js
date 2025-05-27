// This is a sample test file that can be loaded into the IDE
// It's based on the example provided by the user

const sampleTestCode = `import unittest
from contracting.client import ContractingClient
import os, sys
from contracting.stdlib.bridge.time import Timedelta

script_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
os.chdir(script_dir)

MARKETPLACE = 'con_xns_marketplace'
NAMESERVICE = 'con_name_service'          # ← keep in sync with your test-net name

class TestMarketplace(unittest.TestCase):

    def setUp(self):
        self.c = ContractingClient()
        self.c.raw_driver.flush_full()

        with open("submission.s.py") as f:
            contract = f.read()
            self.c.raw_driver.set_contract(name="submission", code=contract)

        # 2. Deploy the currency (we assume it's 'currency.py')
        with open('currency.py') as f:
            code = f.read()
            self.c.submit(
                code,
                name='currency',
                constructor_args={'vk': 'sys'}  # 'sys' will be the "manager" of currency
            )
        self.currency = self.c.get_contract('currency')

        # -------------------- name-service ---------------
        with open('con_nameservice.py') as f:
            self.c.submit(f.read(), name=NAMESERVICE, signer='sys')

        ns = self.c.get_contract(NAMESERVICE)
        ns.set_enabled(state=True, signer='sys')
        ns.set_contract_allowlist(contracts=[MARKETPLACE], signer='sys')

        self.ns  = ns
        self.cur = self.c.get_contract('currency')

        # -------------------- marketplace ----------------
        with open('con_xns_marketplace.py') as f:
            self.c.submit(f.read(), name=MARKETPLACE, signer='sys')
        self.mp = self.c.get_contract(MARKETPLACE)

        # sanity: fee default 1 %
        self.assertEqual(self.mp.fee_percent.get(), 1)

        # Helper: everybody starts w/ plenty of XIAN
        for u in ('user1', 'user2', 'user3'):
            self.cur.transfer(amount=1_000, to=u, signer='sys')

    # ──────────────────────────────────────────────────────────
    #  basic happy-path
    # ──────────────────────────────────────────────────────────
    def test_list_and_buy_flow(self):
        """
        user1 lists 'forsale' for 100 XIAN,
        user2 buys it, user1 gets 99 XIAN (1 % fee),
        user2 becomes owner, listing is cleared.
        """
        price = 100
        fee   = price // 100          # 1

        # --- user1 mints & approves marketplace ---
        self.cur.approve(amount=1, to=NAMESERVICE, signer='user1')
        self.ns.mint_name(name='forsale', signer='user1')
        self.ns.approve(name='forsale', to=MARKETPLACE, signer='user1')

        # --- list the name ---
        self.mp.list_name(name='forsale', price=price, signer='user1')
        listing = self.mp.get_listing(name='forsale')
        self.assertEqual(listing, {'seller': 'user1', 'price': price})

        # --- user2 approves XIAN to marketplace & buys ---
        self.cur.approve(amount=price, to=MARKETPLACE, signer='user2')
        bal_seller_before = self.cur.balance_of(account='user1')
        bal_buyer_before  = self.cur.balance_of(account='user2')

        self.mp.buy_name(name='forsale', signer='user2')

        # Ownership transferred
        self.assertTrue(self.ns.is_owner(name='forsale', address='user2'))
        self.assertFalse(self.ns.is_owner(name='forsale', address='user1'))

        # Listing cleared
        self.assertIsNone(self.mp.get_listing(name='forsale'))

        # Balances: seller +99, buyer −100, fee stays in marketplace
        self.assertEqual(self.cur.balance_of(account='user1'),
                         bal_seller_before + price - fee)
        self.assertEqual(self.cur.balance_of(account='user2'),
                         bal_buyer_before  - price)
        self.assertEqual(self.cur.balance_of(account=MARKETPLACE), fee)

if __name__ == '__main__':
    unittest.main()
`;

// Export the sample test code
export { sampleTestCode };