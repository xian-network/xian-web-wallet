// This is a sample currency contract file that can be loaded into the IDE
// It's a simple currency contract that works with the sample test

const sampleCurrencyCode = `# currency.py
balances = Hash(default_value=0)
metadata = Hash()

@construct
def seed(vk: str):
    balances[vk] = 1_000_000
    metadata['owner'] = vk

@export
def transfer(amount: int, to: str):
    assert amount > 0, 'Amount must be positive!'
    assert balances[ctx.caller] >= amount, 'Not enough coins to send!'

    balances[ctx.caller] -= amount
    balances[to] += amount

@export
def balance_of(account: str):
    return balances[account]

@export
def approve(amount: int, to: str):
    assert amount > 0, 'Amount must be positive!'
    balances[ctx.caller, to] = amount

@export
def transfer_from(amount: int, to: str, main_account: str):
    assert amount > 0, 'Amount must be positive!'
    assert balances[main_account, ctx.caller] >= amount, 'Not enough coins approved to send!'
    assert balances[main_account] >= amount, 'Not enough coins to send!'

    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
`;

// Export the sample currency code
export { sampleCurrencyCode };