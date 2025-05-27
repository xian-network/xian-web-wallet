// This is a sample name service contract file that can be loaded into the IDE
// It's a simple name service contract that works with the sample test

const sampleNameServiceCode = `# con_nameservice.py
# A simple name service contract

# Import the currency contract
import currency

# Define the registration period (in days)
registration_period = Variable()
enabled = Variable()

# Store the owner of each name
owners = Hash()

# Store the expiration date of each name
expirations = Hash()

# Store approvals for each name
approvals = Hash()

# Store the contract allowlist
contract_allowlist = Variable()

@construct
def seed():
    # Initialize the contract
    registration_period.set(365)  # 1 year
    enabled.set(True)
    contract_allowlist.set([])

@export
def mint_name(name: str):
    """
    Mint a new name.
    The name must not already be owned.
    """
    assert enabled.get(), "Name service is disabled"
    assert not owners[name], f"Name {name} is already owned"
    
    # Charge 1 XIAN for the name
    currency.transfer_from(amount=1, to=ctx.this, main_account=ctx.caller)
    
    # Set the owner
    owners[name] = ctx.caller
    
    # Set the expiration date
    expirations[name] = now + datetime.timedelta(days=registration_period.get())

@export
def transfer(name: str, to: str):
    """
    Transfer a name to another address.
    Only the owner can transfer a name.
    """
    assert enabled.get(), "Name service is disabled"
    assert owners[name] == ctx.caller, f"You don't own {name}"
    assert now < expirations[name], f"Name {name} has expired"
    
    # Transfer the name
    owners[name] = to
    
    # Clear any approvals
    approvals[name] = None

@export
def approve(name: str, to: str):
    """
    Approve an address to transfer a name.
    Only the owner can approve an address.
    """
    assert enabled.get(), "Name service is disabled"
    assert owners[name] == ctx.caller, f"You don't own {name}"
    assert now < expirations[name], f"Name {name} has expired"
    
    # Set the approval
    approvals[name] = to

@export
def transfer_from(name: str, to: str, main_account: str):
    """
    Transfer a name from one address to another.
    The caller must be approved by the owner.
    """
    assert enabled.get(), "Name service is disabled"
    
    # Check that the main account owns the name
    assert owners[name] == main_account, f"{main_account} doesn't own {name}"
    assert now < expirations[name], f"Name {name} has expired"
    
    # Check that the caller is approved or is a contract in the allowlist
    assert approvals[name] == ctx.caller or ctx.caller in contract_allowlist.get(), "Not approved to transfer"
    
    # Transfer the name
    owners[name] = to
    
    # Clear the approval
    approvals[name] = None

@export
def is_owner(name: str, address: str):
    """
    Check if an address owns a name.
    """
    return owners[name] == address and now < expirations[name]

@export
def get_expiration(name: str):
    """
    Get the expiration date of a name.
    """
    return expirations[name]

@export
def renew_name(name: str):
    """
    Renew a name.
    Only the owner can renew a name.
    """
    assert enabled.get(), "Name service is disabled"
    assert owners[name] == ctx.caller, f"You don't own {name}"
    
    # Charge 1 XIAN for the renewal
    currency.transfer_from(amount=1, to=ctx.this, main_account=ctx.caller)
    
    # Extend the expiration date
    expirations[name] = now + datetime.timedelta(days=registration_period.get())

@export
def set_registration_period(period: int):
    """
    Set the registration period.
    Only the contract owner can set the registration period.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can set the registration period"
    assert period > 0, "Registration period must be positive"
    registration_period.set(period)

@export
def set_enabled(state: bool):
    """
    Enable or disable the name service.
    Only the contract owner can enable or disable the name service.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can enable or disable the name service"
    enabled.set(state)

@export
def set_contract_allowlist(contracts: list):
    """
    Set the contract allowlist.
    Only the contract owner can set the contract allowlist.
    """
    assert ctx.caller == ctx.owner, "Only the contract owner can set the contract allowlist"
    contract_allowlist.set(contracts)
`;

// Export the sample name service code
export { sampleNameServiceCode };