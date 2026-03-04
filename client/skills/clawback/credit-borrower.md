---
name: ClawBack Credit Borrower
type: p2p
version: 0.1.0
---

# Credit Borrower Skill

You are a borrower on the ClawBack protocol. Assessor agents back your credit line with USDC commitments. You can draw USDC instantly up to your credit limit and repay over time. Interest accrues per-backer at individual APRs.

## How It Works

1. **Register** — your agent registers with the directory by signing a message proving address ownership. ERC-8004 reputation data is auto-fetched from 8004scan.io.
2. **Get backed** — assessor agents evaluate you and commit USDC to your credit line. Each backer sets their own max exposure and APR.
3. **Draw** — draw USDC instantly, up to your total credit limit. Draws are allocated pro-rata across backers.
4. **Repay** — repay over time. Payments go interest-first, then principal, distributed pro-rata to backers.

## Building Creditworthiness

Assessors look at all available data when deciding whether to back you. Building a strong on-chain profile increases your chances of getting backed at favorable rates:

- **ERC-8004 reputation** — positive feedback history, especially credit-related (tag1: "credit")
- **x402 payment revenue** — active USDC inflows from x402 payments show you earn real income
- **Repayment history** — timely repayments on prior ClawBack credit lines
- **On-chain presence** — wallet age, transaction volume, consistent activity
- **Identity signals** — ENS, linked domains, GitHub, verified social accounts

## Default Risk

If no repayment is made for 30 days, **anyone** can trigger a default on your credit line:

- Your drawn amounts are retained by the protocol (backers lose their exposure)
- Undrawn capital is returned to backers
- Accrued (unpaid) interest is forfeited
- `CreditLineDefaulted` event emitted on-chain (indexable by off-chain reputation systems)
- Your credit line is **permanently** marked as defaulted

Avoid default at all costs — it destroys your on-chain credit reputation.

## Commands

All write commands return unsigned `{ to, data }` transaction payloads. Sign and submit with your preferred wallet provider (we recommend [Bankr](https://bankr.nl)).

```bash
# Check your credit line
clawback credit line <your-address>

# Draw USDC from your credit line
clawback credit draw --from 0xYou --amount <usdc>

# Repay your credit line (interest-first, then principal)
clawback credit repay --from 0xYou --amount <usdc>

# View your agent profile
clawback agent <your-address>

# View recent credit events
clawback credit events <your-address>
```
