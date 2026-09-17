# Carkken

**Live:** https://carkken.onrender.com (first load after inactivity can take up to a minute, Render's free tier spins down when idle)

Fractional car ownership, run by a fleet agent that only acts inside the
limits its owners set. Built for the Build with Brickken campaign.

Full write-up, architecture, and vehicle state model: [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md)

## What this is

Vehicles are tokenized as fractional real-world assets on Brickken's sandbox
(uRWA / ERC-7943). A fleet agent with its own on-chain identity (ERC-8004)
handles rental bookings under a scoped, capped, time-bound mandate set by
the fleet owner, settles payment with renter agents, and rental revenue
flows back to fractional investors as dividends. The fleet agent's
reputation is built from real feedback left by a genuinely separate renter
account.

## Surfaces used

- **REST** — direct calls to Brickken's sandbox Dapp API
- **CLI** — `tokenize`, `whitelist`, `mint`, `approve`, `offering-launch`,
  `invest`, `dividend`, `agent-register`, `mandate-issue`, `rent-book`,
  `feedback`
- **MCP server** — the same command set exposed as MCP tools
- **Our own REST API** (`apps/api`) — wraps the SDK for a browser frontend,
  with a set of "Live actions" buttons that trigger real sandbox
  transactions directly from the page

## Brickken methods called so far, all confirmed on-chain

- `newTokenization` — 4 vehicles
- `whitelist` — investor and issuer wallets, on two different tokens
- `mintToken` — supply minted to the issuer wallet
- `approve` — an STO escrow granted allowance over minted supply
- `newSto` — a live offering launched (BMW X5)
- `agentRegister` — two distinct on-chain agent identities (ERC-8004): a
  fleet agent and a test renter agent
- `agentGiveFeedback` — real cross-account feedback, renter agent rating
  the fleet agent

x402 payment signing (EIP-3009 TransferWithAuthorization) is implemented in
`packages/sdk/src/x402.ts` and wired into the payment retry path, tested
against real 402 challenges from the sandbox. Actual settlement is blocked
on holding testnet USDC or EURC, which we don't currently have; the code
degrades gracefully to a "real signed payload, pending funds" result rather
than failing silently.

`newInvest` is in progress: whitelisting, a Fake-USDT mint, and an escrow
approval are all confirmed on-chain for a real investor wallet; the call
itself currently reverts on a KYC check we're following up on with
Brickken's team. `dividendDistribution` depends on a completed investment
existing to distribute, so it's next once `newInvest` clears.

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
| Whitelist | Issuer (self) on CKCOR | `0xe389d9e66012c809cebbce25932077b8821bd74ffd7a317ea61e358aa00b7261` |
| Whitelist | Investor on CKBMW | `0x54f6932a9eadbdced242caaa3bd6902222877dd993d9463937f8a35017d622ad` |
| Mint | 1000 CKCOR to issuer | `0xb083c7c6048b84ac3dcb2bfd0f7735ab82c4b77fed4d34896be7ecaa40a24c44` |
| Approve | STO escrow allowance on CKCOR | `0x4b1ce9d5ddbb818e2936d6908b73c3b0379410839f5ec4efeaf1d5dbf9cc158a` |
| Launch offering | BMW X5 Series A, live Sep 17–Nov 1 | `0xc714721ced97d031c055dabd70fb4f8d9571f580df9785bc696282c171597e10` |
| Mint (direct) | 1000 Fake USDT to investor | `0xa5990e4607f657f167411bf6014126a63b3f0cd5911d4d559987767b867522d3` |
| Approve (direct) | Investor USDT allowance to CKBMW escrow | `0xb2cabdc52fbb5a32846351aab159fcd34773b0b41fa22726144d8710192ab445` |
| Agent register | Fleet agent (ERC-8004 id `10306`) | `0x5e10841442d4fdec26520e1b5d90754b0fb27b4f3bbb5a7a6d53218463614a2b` |
| Agent register | Test renter agent (ERC-8004 id `10307`) | `0x6386f5d6d8550a8c9a474553815adb7f8a8caa4c6d3b2da8f4fc5d2cbc322b85` |
| Give feedback | Renter (10307) rates fleet agent (10306), 5/5 | `0x2781e9172f2156fc61ab422cd02658d8a24b51a314975acb76e6f9f0bf418518` |

Each of these can be independently verified on
[Sepolia Etherscan](https://sepolia.etherscan.io) by searching the
transaction hash. "Mint (direct)" and "Approve (direct)" bypassed
Brickken's API and called the Fake USDT contract directly, since those are
plain ERC-20 functions rather than Brickken methods.

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

Tokenization, whitelisting, minting, escrow approval, STO launch, agent
identity, and real cross-account reputation are all confirmed on-chain.
`newInvest` and `dividendDistribution` are the two remaining pieces, both
in progress with Brickken's team. RAMS (ERC-8226) is implemented as a
client-side enforcement pattern pending confirmation of a live sandbox
endpoint, see `docs/PROJECT_BRIEF.md` section 5.

## AI tool disclosure

Built with assistance from Claude (Anthropic) for architecture, scaffolding,
debugging, and documentation. All Brickken integration logic, transactions,
and submitted results were reviewed and run by a human developer.
