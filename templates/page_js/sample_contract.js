// This is a sample contract file that can be loaded into the IDE
// It's a simple marketplace contract that works with the sample test

const sampleContractCode = `# con_xns_marketplace.py
# A marketplace for buying and selling XNS names

# Import the name service contract
import con_name_service as ns

# Define the fee percentage (default: 1%)
fee_percent = Variable()
name_service_contract = Variable()
enabled = Variable()

@construct
def seed():
    # Initialize the contract
    fee_percent.set(1)  # 1% fee
    name_service_contract.set('con_name_service')
    enabled.set(True)

# Store listings as a Hash of name -> {seller, price}
listings = Hash()

@export
def list_name(name: str, price: int):
    """
    List a name for sale at the specified price.
    The name must be owned by the caller and approved for this contract.
    """
    assert enabled.get(), "Marketplace is disabled"
    
    # Get the name service contract
    ns_contract = name_service_contract.get()
    
    # Check that the caller owns the name
    assert ns[ns_contract].is_owner(name=name, address=ctx.caller), f"You don't own {name}"
    
    # Transfer the name to the marketplace (escrow)
    ns[ns_contract].transfer_from(name=name, to=ctx.this, main_account=ctx.caller)
    
    # Store the listing
    listings[name] = {
        'seller': ctx.caller,
        'price': price
    }

@export
def cancel_listing(name: str):
    """
    Cancel a listing and return the name to the seller.
    Only the seller can cancel a listing.
    """
    assert enabled.get(), "Marketplace is disabled"
    
    # Get the listing
    listing = listings[name]
    assert listing, f"No listing found for {name}"
    
    # Check that the caller is the seller
    assert listing['seller'] == ctx.caller, "Only the seller can cancel a listing"
    
    # Get the name service contract
    ns_contract = name_service_contract.get()
    
    # Transfer the name back to the seller
    ns[ns_contract].transfer(name=name, to=ctx.caller)
    
    # Remove the listing
    listings.pop(name)

@export
def buy_name(name: str):
    """
    Buy a name that is listed for sale.
    The buyer must approve the marketplace to spend the required amount of XIAN.
    """
    assert enabled.get(), "Marketplace is disabled"
    
    # Get the listing
    listing = listings[name]
    assert listing, f"No listing found for {name}"
    
    # Get the price and seller
    price = listing['price']
    seller = listing['seller']
    
    # Calculate the fee
    fee = price * fee_percent.get() // 100
    seller_amount = price - fee
    
    # Get the name service contract
    ns_contract = name_service_contract.get()
    
    # Transfer the XIAN from the buyer to the seller and marketplace
    currency = importlib.import_module('currency')
    currency.transfer_from(amount=seller_amount, to=seller, main_account=ctx.caller)
    
    # If there's a fee, transfer it to the marketplace
    if fee > 0:
        currency.transfer_from(amount=fee, to=ctx.this, main_account=ctx.caller)
    
    # Transfer the name to the buyer
    ns[ns_contract].transfer(name=name, to=ctx.caller)
    
    # Remove the listing
    listings.pop(name)

@export
def get_listing(name: str):
    """
    Get the details of a listing.
    """
    return listings[name]

@export
def set_fee_percent(pct: int):
    """
    Set the fee percentage.
    Only the contract owner can set the fee percentage.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can set the fee percentage"
    assert 0 <= pct <= 100, "Fee percentage must be between 0 and 100"
    fee_percent.set(pct)

@export
def set_enabled(state: bool):
    """
    Enable or disable the marketplace.
    Only the contract owner can enable or disable the marketplace.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can enable or disable the marketplace"
    enabled.set(state)

@export
def set_name_service_contract(address: str):
    """
    Set the name service contract address.
    Only the contract owner can set the name service contract address.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can set the name service contract address"
    name_service_contract.set(address)
`;

// Export the sample contract code
export { sampleContractCode };