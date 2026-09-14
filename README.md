# Carkken

Fractional car ownership, run by a fleet agent that only acts inside the
limits its owners set. Built for the Build with Brickken campaign.

Full write-up, architecture, and vehicle state model: [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md)

## What this is

Vehicles are tokenized as fractional real-world assets on Brickken's sandbox
(uRWA / ERC-7943). A fleet agent with its own on-chain identity handles
rental bookings under a scoped, capped, time-bound mandate set by the fleet
owner, settles payment with renter agents, and rental revenue flows back to
fractional investors as dividends.

## Surfaces used

- **REST** — direct calls to Brickken's sandbox Dapp API (`/prepare-transactions`,
  `/send-transactions`, `/get-transaction-status`, `/get-token-info`)
- **CLI** — `carkken tokenize`, `carkken whitelist`, `carkken offering launch`,
  `carkken agent register`, `carkken mandate issue`, `carkken rent book`,
  `carkken feedback`
- **MCP server** — the same command set exposed as MCP tools so any
  MCP-compatible AI client can drive the same actions conversationally
- **Our own REST API** (`apps/api`) — wraps the SDK for a browser frontend,
  exposes the four fleet marketplace views plus an x402-gated booking endpoint

## Brickken methods called so far

- `newTokenization` — tokenized four vehicles (see transactions below)
- `get-token-info`, `get-transaction-status` — used to verify each result

Still to be called before submission: `whitelist`, `newSto`, `newInvest`,
`agentRegister`, `agentGiveFeedback`, `dividendDistribution`.

## Network

Sepolia Testnet — chainId `aa36a7` (`11155111` decimal)

## Confirmed sandbox transactions

| Vehicle | Token | Transaction hash |
|---|---|---|
| Tesla Model 3 | CKTSL | `0x244cd450ff51ee755f165f150e4b86b16779b89ad29c8a5a9ba6d3fbda41deb7` |
| Toyota Corolla | CKCOR | `0x915e1665485cae54bdc3dcfd71bc1483ab0906872d0611f585fa69130d3569f9` |
| Ford Transit | CKTRN | `0xddbe591669c374108dc369d4c01cdb7d424ee7273dfd0d2b67cc39df068d2709` |
| BMW X5 | CKBMW | `0x1a1b266d5385e99b87ef1c52fdbfe6287d82e9ed555a00f924aa92136688eaed` |

Each of these can be independently verified on
[Sepolia Etherscan](https://sepolia.etherscan.io), separate from Brickken's
own API, by searching the transaction hash.

## Reward wallet

`0xF7b54D9d71646CcAda5953e5466F4BBA2d345080`

## Quickstart

```bash
cp .env.example .env
# fill in BRICKKEN_API_KEY, SIGNER_ADDRESS, PRIVATE_KEY (testnet only)
npm install
npm run build

npm run cli -- tokenize --file examples/vehicle-tesla.json
npm run api      # REST API + fleet page on :4000
npm run agent    # autonomous fleet agent loop
npm run mcp      # MCP server for chat-driven control
```

Set `MOCK_MODE=true` in `.env` to exercise the full flow locally without
hitting the sandbox, useful for development before a key is issued.

## Status

Vehicle tokenization confirmed on-chain for all four vehicles. Whitelisting,
STO launch, agent identity/mandate, and x402 booking settlement are the next
pieces being wired to live sandbox calls. See `docs/PROJECT_BRIEF.md` section 5
for the open question on RAMS (ERC-8226) sandbox support.

## AI tool disclosure

Built with assistance from Claude (Anthropic) for architecture, scaffolding,
debugging, and documentation. All Brickken integration logic, transactions,
and submitted results were reviewed and run by a human developer.
