# Carkken

Fractional car ownership, run by a fleet agent that only acts inside the
limits its owners set. Built for the Build with Brickken campaign.

Full write-up, architecture, and vehicle state model: [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md)

## What this is

Vehicles are tokenized as fractional real-world assets on Brickken's sandbox
(uRWA / ERC-7943). A fleet agent with its own on-chain identity (ERC-8004)
handles rental bookings under a scoped, capped, time-bound mandate set by
the fleet owner, settles payment with renter agents, and rental revenue
flows back to fractional investors as dividends. The fleet agent's
reputation is built from real feedback left by distinct renter accounts.

## Surfaces used

- **REST** — direct calls to Brickken's sandbox Dapp API
- **CLI** — `carkken tokenize`, `whitelist`, `mint`, `approve`, `offering-launch`,
  `agent-register`, `mandate-issue`, `rent-book`, `feedback`
- **MCP server** — the same command set exposed as MCP tools
- **Our own REST API** (`apps/api`) — wraps the SDK for a browser frontend

## Brickken methods called so far

- `newTokenization` — 4 vehicles tokenized
- `whitelist` — investor and issuer wallets whitelisted
- `mintToken` — supply minted to issuer wallet
- `approve` — STO contract granted allowance over minted supply
- `agentRegister` — two distinct on-chain agent identities (ERC-8004): a
  fleet agent and a test renter agent
- `agentGiveFeedback` — real cross-account feedback, renter agent rating the
  fleet agent
- `get-token-info`, `get-transaction-status` — used to verify results

x402 payment signing (EIP-3009 TransferWithAuthorization) is fully implemented in
`packages/sdk/src/x402.ts` and wired into the booking flow, tested against
real `x402Requirements` payloads returned by the sandbox. Actual settlement
is blocked only on funding the signer wallet with testnet USDC, EURC, or
BKN, which we are sourcing from Brickken now.

Still to be resolved: `newSto` currently reverts with an unresolved custom
error (`0xf58f733a`) after ruling out every documented field; reported to
Brickken's `#tech-chat`, awaiting a reply. `newInvest`, `dividendDistribution`,
and the RAMS-pattern mandate are still to be wired to live calls.

## Network

Sepolia Testnet — chainId `aa36a7` (`11155111` decimal)

## Confirmed sandbox transactions

| Action | Detail | Transaction hash |
|---|---|---|
| Tokenize | Tesla Model 3 (CKTSL) | `0x244cd450ff51ee755f165f150e4b86b16779b89ad29c8a5a9ba6d3fbda41deb7` |
| Tokenize | Toyota Corolla (CKCOR) | `0x915e1665485cae54bdc3dcfd71bc1483ab0906872d0611f585fa69130d3569f9` |
| Tokenize | Ford Transit (CKTRN) | `0xddbe591669c374108dc369d4c01cdb7d424ee7273dfd0d2b67cc39df068d2709` |
| Tokenize | BMW X5 (CKBMW) | `0x1a1b266d5385e99b87ef1c52fdbfe6287d82e9ed555a00f924aa92136688eaed` |
| Whitelist | Investor on CKCOR | `0xaf369616095aacda246765c976a731cb5bc4217f6e674d4c95fce918c410bbe3` |
| Mint | 1000 CKCOR to issuer | `0xb083c7c6048b84ac3dcb2bfd0f7735ab82c4b77fed4d34896be7ecaa40a24c44` |
| Approve | STO contract allowance on CKCOR | `0x4b1ce9d5ddbb818e2936d6908b73c3b0379410839f5ec4efeaf1d5dbf9cc158a` |
| Agent register | Fleet agent (ERC-8004 id `10306`) | `0x5e10841442d4fdec26520e1b5d90754b0fb27b4f3bbb5a7a6d53218463614a2b` |
| Agent register | Test renter agent (ERC-8004 id `10307`) | `0x6386f5d6d8550a8c9a474553815adb7f8a8caa4c6d3b2da8f4fc5d2cbc322b85` |
| Give feedback | Renter (10307) rates fleet agent (10306), 5/5 | `0x2781e9172f2156fc61ab422cd02658d8a24b51a314975acb76e6f9f0bf418518` |

Each of these can be independently verified on
[Sepolia Etherscan](https://sepolia.etherscan.io) by searching the
transaction hash.

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
hitting the sandbox.

## Status

Tokenization, whitelisting, minting, approval, agent identity, and a real
two-party feedback/reputation flow are all confirmed on-chain. STO launch is
blocked on an unresolved sandbox-side error, reported to Brickken.
Investment, dividend distribution, the RAMS mandate, and x402 booking
settlement are still being wired up.

## AI tool disclosure

Built with assistance from Claude (Anthropic) for architecture, scaffolding,
debugging, and documentation. All Brickken integration logic, transactions,
and submitted results were reviewed and run by a human developer.
