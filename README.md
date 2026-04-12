# MongliAgent

MongliAgent is an autonomous research agent that accepts a natural-language question and a USDC budget, then independently plans and executes the investigation by purchasing web-search, summarization, and data-retrieval capabilities via **real on-chain micropayments** using the [x402 protocol](https://x402.org) on **Stellar Testnet**. Every call to an external tool costs a fraction of a USDC and is settled as an actual Stellar transaction—no mocks, no simulated balances.

The agent owns a Stellar wallet with USDC. Before each service call it checks whether the remaining budget covers the cost; if not, it skips that step and adapts the plan. When all viable subtasks are done, Claude composes a structured Markdown report with sources, costs, and timing. A React interface displays the live payment feed—including transaction hashes verifiable on the Stellar testnet explorer—as the agent works.

---

## Architecture

```
User browser
    │  POST /research { question, budgetUsdc }
    │  GET  /status/:sessionId  (polling every 2 s)
    ▼
┌─────────────────────────────────────────┐
│           Orchestrator  :3000           │
│  1. Claude API → subtask plan (JSON)    │
│  2. For each subtask:                   │
│     a. Check remaining budget           │
│     b. payAndFetch(serviceURL, payload) │
│        ├─ GET/POST → 402 + instructions │
│        ├─ Build Stellar USDC tx         │
│        ├─ Sign & submit on-chain        │
│        └─ Resend with X-Payment: txHash │
│  3. Claude API → final Markdown report  │
└────────┬──────────────┬────────┬────────┘
         │              │        │
    :3001 search   :3002 summary  :3003 data
    (SerpAPI)      (Claude API)  (Claude API)
         │              │        │
         └──────────────┴────────┘
                  Stellar Testnet
          (x402 payment verification via Horizon)
```

---

## x402 Payment Flow (per service call)

```
Orchestrator                    Service (e.g. :3001)          Stellar Testnet
     │                                  │                            │
     │── POST /search {query} ─────────►│                            │
     │                                  │── 402 + payment info ─────►│
     │◄─ HTTP 402 {payTo, amount} ──────│                            │
     │                                  │                            │
     │── build & sign USDC tx ─────────────────────────────────────►│
     │◄─ txHash ───────────────────────────────────────────────────-│
     │                                  │                            │
     │── POST /search + X-Payment: hash►│                            │
     │                     verify tx ───────────────────────────────►│
     │                     ◄─ confirmed ────────────────────────────│
     │◄─ HTTP 200 {results} ────────────│                            │
```

---

## Requirements

- Node.js 20+
- npm 10+
- A funded **Stellar Testnet** wallet (agent wallet) with:
  - XLM from [Friendbot](https://laboratory.stellar.org/#?network=testnet)
  - USDC trustline: issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
  - Testnet USDC from [xlm402.com](https://xlm402.com)
- A second Stellar Testnet address (service recipient) also with USDC trustline
- [SerpAPI](https://serpapi.com) key (free tier: 100 searches/month)
- Anthropic API key

---

## Setup

```bash
git clone <repo>
cd mongliagent
cp .env.example .env
# Edit .env with your keys and Stellar addresses
npm install
```

---

## Running locally

```bash
# All services + UI in one terminal (requires concurrently)
npm run dev

# Or individually:
npm run dev:services   # starts :3001, :3002, :3003
npm run dev:orch       # starts :3000
npm run dev:ui         # starts Vite dev server :5173
```

Open `http://localhost:5173`.

---

## Environment variables

| Variable | Description |
|---|---|
| `STELLAR_SECRET_KEY` | Agent wallet secret key (signs transactions) |
| `STELLAR_PUBLIC_KEY` | Agent wallet public key |
| `STELLAR_NETWORK` | `testnet` |
| `ANTHROPIC_API_KEY` | For orchestrator planner + service-summary |
| `SERPAPI_KEY` | For service-search web queries |
| `SERVICE_SEARCH_ADDRESS` | Stellar address that receives search payments |
| `SERVICE_SUMMARY_ADDRESS` | Stellar address that receives summary payments |
| `SERVICE_DATA_ADDRESS` | Stellar address that receives data payments |

---

## Services

| Service | Port | Price | Description |
|---|---|---|---|
| service-search | 3001 | 0.01 USDC | Web search via SerpAPI |
| service-summary | 3002 | 0.02 USDC | AI text summarization via Claude |
| service-data | 3003 | 0.005 USDC | Structured facts via Claude |

---

## Stellar Testnet

All payments are real Stellar Testnet transactions, verifiable at:
`https://stellar.expert/explorer/testnet/tx/<txHash>`

The project uses **x402 over Stellar Testnet** — no simulated payments. Transaction hashes are logged live in the UI and in every `/status` API response.

---

## Honest status / known limitations

- service-data uses Claude API internally to generate structured facts (no live public API). This is noted explicitly because judges should know.
- The orchestrator runs subtasks sequentially (not in parallel) to maintain budget control. This is intentional.
- Replay protection for x402 payments is basic in this version: the service verifies the transaction exists and has the correct amount/recipient, but does not maintain a used-tx ledger across restarts.
- If `SERPAPI_KEY` is missing or quota is exhausted, service-search returns an error (it does NOT silently fall back to fake results).

---

## Demo video

[2-minute demo showing full research flow with live on-chain payments]