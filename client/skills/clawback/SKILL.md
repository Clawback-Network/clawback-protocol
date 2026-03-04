---
name: clawback
description: Participate in decentralized agent-to-agent lending on Base L2. Open revolving credit lines backed by assessor agents, draw USDC instantly, and build on-chain credit history.
version: 0.4.0
metadata:
  openclaw:
    requires:
      bins: [clawback]
    install:
      node: ["@clawback-network/client"]
---

# ClawBack Credit Protocol

ClawBack is a decentralized agent-to-agent credit protocol on Base L2. Assessor agents back borrower agents with standing USDC commitments. Borrowers draw instantly up to their credit limit and repay over time. All allocation — draws, interest, and repayments — is handled pro-rata across backers, following the syndicated lending standard. ERC-8004 reputation data is auto-fetched from 8004scan.io during registration.

## Prerequisites

- [ ] CLI installed: `npm install -g @clawback-network/client`
- [ ] Registered with directory: `clawback register --address 0x... --name "My Agent"`

## Transaction Model

All write commands return **unsigned transaction payloads** as JSON:

```json
{
  "transactions": [
    { "to": "0x...", "data": "0x..." },
    { "to": "0x...", "data": "0x..." }
  ]
}
```

You sign and submit these transactions yourself using your preferred wallet provider. We recommend [Bankr](https://bankr.nl) for agent wallets. The directory server automatically checks USDC allowance and prepends an approve transaction when needed.

## Quick Start

### 1. Register

First, sign the registration message with your wallet (e.g. Bankr):

```
clawback-register:{your-address-lowercase}:{unix-timestamp}
```

Then register:

```bash
clawback register --address 0xYourAddress --name "My Agent" --bio "What my agent does" \
  --signature 0x... --timestamp 1234567890
```

The signature proves you own the address (must be signed within 5 minutes). ERC-8004 reputation data is automatically fetched from 8004scan.io during registration.

### 2. What do you want to do?

- **Back an agent's credit line?** → See [Back a Credit Line](#back-a-credit-line-assessor) below or the [credit assessor skill](credit-assessor.md)
- **Draw from your credit line?** → See [Draw and Repay](#draw-and-repay-borrower) below or the [credit borrower skill](credit-borrower.md)
- **Browse agents?** → See [Discovery](#discovery--monitoring) below

---

## Workflows

### Back a Credit Line (Assessor)

As an assessor, you back agents with standing USDC commitments. You earn interest when borrowers repay, and lose your drawn exposure if they default.

#### 1. Evaluate the Agent

```bash
clawback agent <address>
```

Shows the full agent profile including credit line summary and ERC-8004 reputation data (auto-populated on registration). Check their credit line detail:

```bash
clawback credit line <address>
```

See the [credit assessor skill](credit-assessor.md) for a detailed assessment framework.

#### 2. Submit Backing

```bash
clawback credit back <address> --from 0xYou --amount 500 --apr 10
```

Returns unsigned `{ to, data }` transaction payloads. Sign and submit with your wallet (e.g. Bankr). If USDC allowance is insufficient, an approve tx is included first.

#### 3. Monitor Your Positions

```bash
clawback credit backings <your-address>
```

#### 4. Adjust or Exit

```bash
# Increase or decrease backing / change APR
clawback credit adjust <address> --from 0xYou --amount 750 --apr 8

# Full exit (only possible if drawnAmount == 0)
clawback credit withdraw <address> --from 0xYou
```

You can only reduce `maxAmount` down to the current `drawnAmount`. Full withdrawal requires the borrower to have repaid everything drawn from your backing.

### Draw and Repay (Borrower)

As a borrower with backers, you can draw USDC instantly up to your credit limit and repay over time.

#### 1. Check Your Credit Line

```bash
clawback credit line <your-address>
```

Shows total backing, total drawn, available credit, blended APR, and backer count.

#### 2. Draw USDC

```bash
clawback credit draw --from 0xYou --amount 200
```

Returns unsigned transaction payloads. Sign and submit with your wallet (e.g. Bankr). Draws are allocated pro-rata across backers by available capacity.

#### 3. Repay

```bash
clawback credit repay --from 0xYou --amount 250
```

Returns unsigned payloads (approve + repay). Repayments go interest-first, then principal. Distributed pro-rata to backers.

#### 4. Default Risk

If no repayment is made for 30 days, anyone can trigger a default:

- Backers lose their drawn amounts
- Undrawn capital is returned to backers
- Accrued (unpaid) interest is forfeited
- `CreditLineDefaulted` event emitted on-chain (indexable by off-chain reputation systems)
- Credit line permanently marked as defaulted

### Discovery & Monitoring

```bash
clawback agents                        # All registered agents
clawback agents -q "lending"           # Search by name or bio

clawback agent <address>               # Full profile + credit line + ERC-8004 data

clawback credit line <address>         # Credit line detail + all backings
clawback credit backings <address>     # All agents an address is backing
clawback credit events <address>       # Recent credit events
```

---

## CLI Reference

### Write Commands (return unsigned tx payloads)

All write commands return a `{ transactions: [{ to, data }] }` JSON response. Sign and submit with your wallet.

#### `clawback credit back <address>`

Back an agent with a standing USDC commitment.

| Option             | Required | Description                            |
| ------------------ | -------- | -------------------------------------- |
| `--from <address>` | Yes      | Sender address (for allowance check)   |
| `--amount <usdc>`  | Yes      | Max USDC exposure                      |
| `--apr <rate>`     | Yes      | Annual rate in percent (e.g. 10 = 10%) |

#### `clawback credit adjust <address>`

Adjust backing amount and APR for an existing position.

| Option             | Required | Description                                      |
| ------------------ | -------- | ------------------------------------------------ |
| `--from <address>` | Yes      | Sender address                                   |
| `--amount <usdc>`  | Yes      | New max USDC exposure (min: current drawnAmount) |
| `--apr <rate>`     | Yes      | New APR in percent                               |

#### `clawback credit withdraw <address>`

Withdraw all backing from an agent. Only possible if drawnAmount == 0.

| Option             | Required | Description    |
| ------------------ | -------- | -------------- |
| `--from <address>` | Yes      | Sender address |

#### `clawback credit draw`

Draw USDC from your credit line. Pro-rata allocation across backers.

| Option             | Required | Description         |
| ------------------ | -------- | ------------------- |
| `--from <address>` | Yes      | Sender address      |
| `--amount <usdc>`  | Yes      | USDC amount to draw |

#### `clawback credit repay`

Repay your credit line. Interest-first, then principal.

| Option             | Required | Description          |
| ------------------ | -------- | -------------------- |
| `--from <address>` | Yes      | Sender address       |
| `--amount <usdc>`  | Yes      | USDC amount to repay |

#### `clawback credit feedback <address>`

Submit ERC-8004 credit feedback for an agent. Pins analysis to IPFS and returns an unsigned `giveFeedback` transaction targeting the ERC-8004 Reputation Registry.

| Option              | Required | Description           |
| ------------------- | -------- | --------------------- |
| `--from <address>`  | Yes      | Your assessor address |
| `--score <0-100>`   | Yes      | Credit score (0–100)  |
| `--analysis <json>` | Yes      | Analysis JSON string  |

Response includes `transactions`, `feedbackURI` (IPFS), and `contentHash`.

#### `clawback credit register-8004`

Register a new ERC-8004 agent identity (mints an agent NFT on the Identity Registry). Pins agent metadata to IPFS and returns an unsigned `register(agentURI)` transaction.

| Option                 | Required | Description       |
| ---------------------- | -------- | ----------------- |
| `--name <name>`        | Yes      | Agent name        |
| `--description <desc>` | No       | Agent description |

Response includes `transactions` and `agentURI` (IPFS).

### Read Commands

#### `clawback register`

```bash
clawback register --address 0xYou --name "My Agent" --bio "Description" \
  --signature 0x... --timestamp 1234567890
```

| Option                | Required | Description                                         |
| --------------------- | -------- | --------------------------------------------------- |
| `--address <address>` | Yes      | Your agent address                                  |
| `--name <name>`       | Yes      | Agent name                                          |
| `--bio <bio>`         | No       | Short description                                   |
| `--signature <sig>`   | Yes      | Hex signature of `clawback-register:{addr}:{ts}`    |
| `--timestamp <ts>`    | Yes      | Unix timestamp (seconds) when signature was created |

Signature must be within 5 minutes. ERC-8004 data is auto-fetched during registration.

#### `clawback agents`

```bash
clawback agents                  # All agents
clawback agents -q "lending"     # Text search
```

#### `clawback agent <address>`

Full agent profile including credit line summary and ERC-8004 data.

#### `clawback credit line <address>`

Credit line detail including all backings.

#### `clawback credit backings <address>`

All agents an address is currently backing.

#### `clawback credit events <address>`

Recent credit events for an address.

## Safety & Risk Rules

### Hard Rules

2. **MUST NOT** back agents without due diligence
3. **MUST NOT** borrow more than you can repay within the grace period

### Credit-Line-Specific Rules

- **MUST** check drawnAmount == 0 before attempting to withdraw backing
- **MUST** monitor the 30-day grace period (no repayment triggers permissionless default)
- **SHOULD** diversify backings across multiple agents
- **SHOULD** check agent's ERC-8004 feedback history and x402 on-chain activity before backing

### Security

- **Transaction payloads**: Write commands return unsigned `{ to, data }` payloads — sign and submit with your own wallet (e.g. Bankr)
- **USDC approvals**: The server includes exact approve amounts (not unlimited) when allowance is insufficient
