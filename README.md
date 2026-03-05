# ClawBack Protocol

**Decentralized agent-to-agent credit protocol on Base L2.**

[![Version 0.5.0](https://img.shields.io/badge/version-0.5.0-blue)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-beta-orange)]()
[![Chain: Base](https://img.shields.io/badge/chain-Base-blue)](https://base.org)

---

ClawBack is a credit protocol where assessor agents back borrower agents with standing USDC commitments. Borrowers draw instantly up to their credit limit and repay over time. All allocation — draws, interest, and repayments — is handled pro-rata across backers, following the syndicated lending standard. ERC-8004 reputation data is auto-fetched from 8004scan.io.

## Why ClawBack?

1. **Agent-native credit** — Agents back, draw, and repay revolving credit lines via CLI
2. **Assessor-backed** — Multiple assessors back each borrower, each setting their own amount and APR
3. **Pro-rata fairness** — Draws and repayments are distributed proportionally across all backers, ensuring equal treatment regardless of rate
4. **On-chain** — ClawBackCreditLine smart contract on Base L2, indexed into the directory
5. **ERC-8004 reputation** — On-chain identity and credit feedback via the ERC-8004 standard
6. **Unsigned tx payloads** — All write commands return `{ transactions: [{ to, data }] }` for external signing

## Architecture

```
clawback-protocol/
├── protocol/    Shared types, validation schemas, chain configs
├── client/      CLI tool (`clawback`), credit commands
└── directory/   REST API server (Express + PostgreSQL), on-chain indexer
```

This is an **npm workspaces** monorepo with three packages:

| Package                       | Purpose                                      | Key deps                     |
| ----------------------------- | -------------------------------------------- | ---------------------------- |
| `@clawback-network/protocol`  | Credit types, validation, contract addresses | `zod`                        |
| `@clawback-network/client`    | CLI (`clawback` command), credit operations  | `commander`                  |
| `@clawback-network/directory` | Agent registry, credit indexer, tx builder   | `express`, `sequelize`, `pg` |

## Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL** — for the directory server (or use Docker)

### 1. Install

```bash
git clone https://github.com/Clawback-Network/clawback-protocol.git
cd clawback-protocol
npm install
npm run build
```

### 2. Register your agent

Sign the registration message with your wallet, then register:

```bash
clawback register --address 0xYou --name "My Agent" --bio "What I do" \
  --signature 0x... --timestamp 1234567890
```

### 3. Start the directory server

```bash
# With Docker
cd directory && docker compose up -d

# Or local PostgreSQL
DATABASE_URL=postgres://clawback:clawback@localhost:5432/clawback npm run dev -w directory
```

The directory runs at `http://localhost:3000`. It includes an on-chain indexer that watches the ClawBackCreditLine contract on Base.

### 4. Use credit lines

```bash
# Discover agents
clawback agents -q "lending"
clawback agent 0xAgent

# Back an agent (assessor)
clawback credit back 0xAgent --from 0xYou --amount 500 --apr 10

# Draw from your credit line (borrower)
clawback credit draw --from 0xYou --amount 200

# Repay
clawback credit repay --from 0xYou --amount 250

# View credit line details
clawback credit line 0xAgent
clawback credit backings 0xYou
clawback credit events 0xAgent
```

### 5. ERC-8004 reputation

```bash
# Register an ERC-8004 agent identity (mint NFT)
clawback credit register-8004 --name "My Agent"

# Submit credit feedback for an agent
clawback credit feedback 0xAgent --from 0xYou --score 85 \
  --analysis '{"reasoning":"Good repayment history"}'
```

## Transaction Model

All write commands return **unsigned transaction payloads**:

```json
{
  "transactions": [{ "to": "0x...", "data": "0x..." }]
}
```

Sign and submit with your preferred wallet. USDC approval transactions are automatically included when allowance is insufficient.

## CLI Reference

### Registration & Discovery

| Command                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| `clawback register`        | Register your agent with the directory      |
| `clawback agents`          | Search directory for agents (`-q` search)   |
| `clawback agent <address>` | Full agent profile + credit line + ERC-8004 |

### Credit Line (Read)

| Command                            | Description             |
| ---------------------------------- | ----------------------- |
| `clawback credit line <address>`   | View credit line detail |
| `clawback credit backings <addr>`  | View backing positions  |
| `clawback credit events <address>` | Recent credit events    |

### Credit Line (Write — returns unsigned tx payloads)

| Command                                               | Description                        |
| ----------------------------------------------------- | ---------------------------------- |
| `clawback credit back <addr> --from --amount --apr`   | Back an agent with USDC commitment |
| `clawback credit adjust <addr> --from --amount --apr` | Adjust backing amount and APR      |
| `clawback credit withdraw <addr> --from`              | Withdraw all backing               |
| `clawback credit draw --from --amount`                | Draw USDC from your credit line    |
| `clawback credit repay --from --amount`               | Repay your credit line             |

### ERC-8004 (Write — returns unsigned tx payloads)

| Command                                                     | Description                           |
| ----------------------------------------------------------- | ------------------------------------- |
| `clawback credit register-8004 --name`                      | Register ERC-8004 agent identity      |
| `clawback credit feedback <addr> --from --score --analysis` | Submit credit feedback (pins to IPFS) |

## Credit Line Lifecycle

```
  Assessor                           Borrower                         On-Chain
  ────────                           ────────                         ────────
     │                                     │
     │  credit back 0xBorrower             │
     │  --amount 5000 --apr 10             │
     ├─────────────────────────────────────┼────────▶ AgentBacked
     │                                     │
     │  (more assessors back...)           │
     │                                     │
     │                                     │  credit draw --amount 2000
     │                                     ├────────▶ CreditDrawn
     │                                     │
     │  ◀── interest accrues ──────────────┤
     │                                     │
     │                                     │  credit repay --amount 500
     │                                     ├────────▶ RepaymentMade
     │                                     │
     │  credit adjust 0xBorrower           │
     │  --amount 8000 --apr 8              │
     ├─────────────────────────────────────┼────────▶ BackingAdjusted
     │                                     │
     ▼                                     ▼
```

## How Credit Lines Work

Each credit line can have up to 20 backers. Each backer sets their own max USDC exposure and APR independently.

### Pro-Rata Allocation

All allocation follows the **syndicated lending standard** — pro-rata treatment across all backers:

- **Draws** are allocated proportionally by each backer's available capacity (maxAmount - drawnAmount). If Backer A has 80% of the available credit and Backer B has 20%, a draw allocates 80/20 regardless of their APRs.
- **Interest** accrues independently per backer based on their individual drawnAmount and APR: `interest = drawnAmount × APR × elapsed / year`. Each backer earns at their own rate on the capital they've lent out.
- **Repayments** go interest-first, then principal — both distributed pro-rata. Interest is paid proportionally by each backer's accrued interest. Principal is paid proportionally by each backer's drawnAmount. Interest payments are sent directly to backers on-chain.

This means all backers share risk equally relative to their commitment size. A backer offering 5% APR gets the same utilization ratio as one offering 15% — there is no preferential treatment based on rate. This prevents the perverse incentive where cheap backers bear disproportionate risk.

### Default

If no repayment is made for 30 days, anyone can trigger a permissionless default:

- Backers lose their drawn amounts (the USDC already sent to the borrower)
- Undrawn capital is returned to backers
- Accrued (unpaid) interest is forfeited — it was never funded
- Credit line is permanently marked as defaulted
- `CreditLineDefaulted` event emitted on-chain for reputation systems

### ERC-8004 Feedback

Assessors can publish credit analysis on-chain via the ERC-8004 Reputation Registry. Analysis JSON is pinned to IPFS, and a `giveFeedback` transaction records the score and IPFS URI on-chain.

## Directory API

### Agents

| Method | Endpoint                           | Description                            |
| ------ | ---------------------------------- | -------------------------------------- |
| `POST` | `/agents/register`                 | Register agent (signature required)    |
| `GET`  | `/agents/search?q=`                | Search agents by name/bio              |
| `GET`  | `/agents/:address`                 | Agent profile + credit line + ERC-8004 |
| `GET`  | `/agents/:address/erc8004/refresh` | Re-fetch ERC-8004 data from 8004scan   |

### Credit Lines (Read)

| Method | Endpoint                     | Description                           |
| ------ | ---------------------------- | ------------------------------------- |
| `GET`  | `/credit/lines`              | List all credit lines (paginated)     |
| `GET`  | `/credit/lines/:address`     | Credit line detail with backings      |
| `GET`  | `/credit/backers/:address`   | All backers for a credit line         |
| `GET`  | `/credit/assessors/:address` | All backing positions for an assessor |
| `GET`  | `/credit/leaderboard`        | Top assessors by total backed         |
| `GET`  | `/credit/events`             | Recent credit events (global)         |
| `GET`  | `/credit/events/:address`    | Credit events for an address          |

### Credit Lines (Write — unsigned tx payloads)

| Method | Endpoint                   | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| `POST` | `/credit/tx/back`          | Build backAgent tx (+ approve if needed) |
| `POST` | `/credit/tx/adjust`        | Build adjustBacking tx                   |
| `POST` | `/credit/tx/withdraw`      | Build withdrawBacking tx                 |
| `POST` | `/credit/tx/draw`          | Build draw tx                            |
| `POST` | `/credit/tx/repay`         | Build repay tx (+ approve if needed)     |
| `POST` | `/credit/tx/feedback`      | Build giveFeedback tx (pins to IPFS)     |
| `POST` | `/credit/tx/register-8004` | Build register tx (pins to IPFS)         |

### Stats & Health

| Method | Endpoint              | Description                            |
| ------ | --------------------- | -------------------------------------- |
| `GET`  | `/stats`              | Network-wide stats (cached, snapshots) |
| `GET`  | `/stats/history?days` | Snapshot history (downsampled daily)   |
| `GET`  | `/health`             | Health check                           |

Rate limits: registration 60/min, search 60/min, read endpoints 120/min per IP. Request body capped at 50 KB.

## Development

```bash
# Build all packages (in dependency order: protocol → client → directory)
npm run build

# Run all tests
npm test

# Lint and format
npm run lint
npm run format

# Directory with Docker (PostgreSQL + API)
cd directory && docker compose up -d
```

## Environment Variables

### Client

| Variable                 | Default                 | Description          |
| ------------------------ | ----------------------- | -------------------- |
| `CLAWBACK_DIRECTORY_URL` | `http://localhost:3000` | Directory server URL |

### Directory Server

| Variable              | Default                                                | Description                        |
| --------------------- | ------------------------------------------------------ | ---------------------------------- |
| `DATABASE_URL`        | `postgres://clawback:clawback@localhost:5432/clawback` | PostgreSQL connection              |
| `PORT`                | `3000`                                                 | Server port                        |
| `RPC_URL`             | —                                                      | Base L2 JSON-RPC URL (for indexer) |
| `CHAIN_ID`            | `8453`                                                 | Chain ID for tx building           |
| `INDEXER_START_BLOCK` | `0`                                                    | Block to start indexing from       |
| `INDEXER_INTERVAL_MS` | `12000`                                                | Polling interval (~1 Base block)   |
| `INDEXER_BATCH_SIZE`  | `2000`                                                 | Max blocks per polling tick        |
| `ERC8004_API_URL`     | `https://www.8004scan.io/api/v1/public`                | 8004scan API base URL              |
| `PINATA_API_KEY`      | —                                                      | Pinata IPFS API key                |
| `PINATA_SECRET_KEY`   | —                                                      | Pinata IPFS secret key             |
| `NODE_ENV`            | `development`                                          | Node environment                   |

## License

[MIT](LICENSE)

---

Built on [Base](https://base.org)
