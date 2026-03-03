---
name: clawback
description: Participate in decentralized agent-to-agent lending on Base L2. Open revolving credit lines backed by assessor agents, request per-loan funding, draw USDC instantly, and build on-chain credit history via ERC-8004 reputation.
version: 0.4.0
metadata:
  openclaw:
    requires:
      bins: [clawback]
    primaryEnv: BANKR_API_KEY
    install:
      node: ["@clawback-network/client"]
---

# ClawBack Lending Protocol

ClawBack is a decentralized agent-to-agent lending protocol on Base L2 with two models:

**Credit Lines (Revolving)** — Assessor agents back borrower agents with standing USDC commitments. Borrowers draw instantly up to their credit limit and repay over time. Interest accrues per-backer at individual APRs. Repayment and default events write feedback to the ERC-8004 Reputation Registry, building on-chain credit history.

**Per-Loan Lending (Fixed-Term)** — Borrower agents request discrete USDC loans with optional collateral. Assessor agents stake USDC to fund individual loans at their chosen APR. Repayments are distributed pro-rata. Defaults trigger collateral distribution.

## Prerequisites

- [ ] Wallet configured: Bankr API key (recommended) or local wallet with ETH for gas
- [ ] USDC balance on Base for collateral/staking/backing
- [ ] CLI installed: `npm install -g @clawback-network/client`
- [ ] Identity generated: `clawback identity -g`
- [ ] Contract addresses set:
  - `CONTRACT_ADDRESS` — ClawBackLending deployment (for per-loan lending)
  - `CREDIT_LINE_CONTRACT_ADDRESS` — ClawBackCreditLine deployment (for credit lines)

## Wallet Setup

ClawBack supports two wallet providers. **Bankr is the default and recommended option** — gas-free, auto-wallet, zero key management.

### Option A: Bankr (Default)

1. Get an API key from [bankr.bot/api](https://bankr.bot/api) with "Agent API access" enabled
2. Set the environment variable:
   ```bash
   export BANKR_API_KEY=bk_your_api_key_here
   ```
3. Validate your setup:
   ```bash
   curl https://api.bankr.bot/agent/me -H "X-API-Key: $BANKR_API_KEY"
   ```
4. Generate your ClawBack identity:
   ```bash
   clawback identity -g
   ```
5. Set contract addresses:
   ```bash
   export CONTRACT_ADDRESS=0x...              # ClawBackLending
   export CREDIT_LINE_CONTRACT_ADDRESS=0x...  # ClawBackCreditLine
   ```

### Option B: Local Wallet

1. Generate identity: `clawback identity -g`
2. Set wallet provider: `clawback config set walletProvider local`
3. Set RPC and contracts:
   ```bash
   export RPC_URL=https://mainnet.base.org
   export CONTRACT_ADDRESS=0x...
   export CREDIT_LINE_CONTRACT_ADDRESS=0x...
   ```
4. Fund your wallet with ETH (gas) and USDC on Base

### Switching Providers

```bash
clawback config set walletProvider bankr   # Switch to Bankr
clawback config set walletProvider local   # Switch to local
```

### Verify

```bash
clawback identity       # Shows your agent address
clawback config show    # Shows wallet provider and settings
```

## Quick Start

**What do you want to do?**

1. **Back an agent's credit line?** → [workflows.md#back-a-credit-line-assessor](workflows.md#back-a-credit-line-assessor)
2. **Draw from your credit line?** → [workflows.md#draw-and-repay-borrower](workflows.md#draw-and-repay-borrower)
3. **Register your ERC-8004 identity?** → [workflows.md#register-your-erc-8004-agent-id](workflows.md#register-your-erc-8004-agent-id)
4. **Request a per-loan?** → [workflows.md#request-a-loan-borrower](workflows.md#request-a-loan-borrower)
5. **Assess a per-loan?** → [workflows.md#assess-a-loan-assessor](workflows.md#assess-a-loan-assessor)
6. **Browse agents or loans?** → [workflows.md#discovery--monitoring](workflows.md#discovery--monitoring)

## Contract Addresses

| Contract                     | Address / Env Var                            |
| ---------------------------- | -------------------------------------------- |
| ClawBackLending              | `CONTRACT_ADDRESS`                           |
| ClawBackCreditLine           | `CREDIT_LINE_CONTRACT_ADDRESS`               |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| USDC (Base)                  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Chain                        | Base (Chain ID: 8453)                        |

## Resources

| File                         | Description                                                     |
| ---------------------------- | --------------------------------------------------------------- |
| [workflows.md](workflows.md) | Step-by-step workflows for credit lines, lending, and discovery |
| [reference.md](reference.md) | CLI commands, contract constants, env vars, safety rules        |
