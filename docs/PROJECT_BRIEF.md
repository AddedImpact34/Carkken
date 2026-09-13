# Carkken

Fractional car ownership, run by a compliance-bound autonomous agent.

Built for **Build with Brickken** (Aug 7 – Sep 17, 2026 campaign).

---

## 1. What this is

Carkken tokenizes real vehicles as fractional real-world assets on Brickken's
sandbox (ERC-7943 / uRWA), then hands day-to-day operation of each vehicle to
an autonomous **fleet agent**. The agent has a verifiable on-chain identity
(ERC-8004), operates under a spending- and scope-capped **RAMS mandate**
(ERC-8226) set by the fleet owner, books rentals and settles payment with
renter agents over **x402**, and earns a portable reputation score from
feedback left after each rental. Rental revenue collected by the agent flows
back to fractional investors as dividends.

In one sentence: **investors own fractions of a car, an authorized AI agent
rents it out on their behalf within limits they set, and the money comes back
to them automatically.**

This is deliberately built to hit all four criteria the Brickken team judges
on:

| Criterion | How Carkken addresses it |
|---|---|
| Technical execution | Full lifecycle actually runs against sandbox: tokenize → whitelist → STO → invest → agent identity → mandate → x402 booking → feedback → dividend distribution |
| Depth of Brickken infra use | Touches Dapp API (tokenization lifecycle), ERC-8004 (identity + reputation), x402 (payment), and RAMS (mandate) — not just one surface |
| Originality | Nobody else is likely combining fractional RWA ownership with a mandate-bound autonomous rental agent; this is the "Agentic Capital Markets" story Brickken itself has been publishing about, applied to a concrete consumer-facing asset class |
| Documentation clarity | This doc + per-package READMEs + a recorded demo walking the full loop |

---

## 2. The core loop

```
Investors tokenize the vehicle
   (newTokenization, whitelist, STO — uRWA)
              |
              v
Fleet owner sets a RAMS mandate
   (scoped, capped, time-bound authority)
              |
              v
Fleet agent (ERC-8004 identity)
   books rental, checks mandate, settles x402
              |
              v
Renter agent uses the vehicle
   pays per use, leaves on-chain feedback
              |
              v
Dividend distribution
   rental revenue paid out to token holders
              |
              +---> loops back: funds the next tokenized vehicle / STO
```

Each arrow is a real, verifiable sandbox transaction — the submission will
include the `chainId` and transaction hashes for every step, per the
campaign's evaluation requirement.

---

## 3. Vehicle states shown in the app

A single `Vehicle` object moves through these states, and the app (API + any
frontend built on it) shows cars in every state at once — this is what makes
the loop visible rather than just implied:

- `DRAFT` — created locally, not yet tokenized
- `TOKENIZING` — `newTokenization` submitted, awaiting confirmation
- `OFFERING_LIVE` — STO open, investors can `newInvest`
- `TOKENIZED` — fully funded, owned by fractional investors, not yet listed
- `LISTED_FOR_RENT` — fleet agent has it available; visible to renter agents
- `BOOKED` — actively rented; shows renter agent id, rate, live x402 tx hash
- `IN_MAINTENANCE` — temporarily withdrawn from rental pool
- `RETIRED` — no longer tokenized/active

Views exposed on top of this model:

1. **Investment marketplace** — vehicles in `OFFERING_LIVE`, funding progress, price per share
2. **Rental marketplace** — vehicles in `LISTED_FOR_RENT`, rate, fleet agent reputation score, mandate summary (cap/expiry)
3. **Live bookings** — vehicles in `BOOKED`, renter, tx hash, running cost
4. **Fleet performance** — per-vehicle dividend history paid to token holders

---

## 4. Surfaces (four tracks, one system)

Only the SDK talks to Brickken directly. Everything else is a thin layer on
top of it, so "depth of infra use" and "composing surfaces" both come from
the same core code, not duplicated logic.

- **SDK** (`packages/sdk`) — `BrickkenClient` (prepare → sign → send → poll,
  x402 retry-with-payment), plus car-domain functions: `tokenizeVehicle`,
  `launchLeaseOffering`, `registerFleetAgent`, `issueMandate`, `bookAndPay`,
  `leaveFeedback`, `distributeDividends`.
- **CLI + MCP** (`apps/cli-mcp`) — one command handler set exposed two ways:
  a normal CLI binary (`carkken tokenize`, `carkken agent register`,
  `carkken rent book`, `carkken mandate issue`) and as MCP tools so any
  MCP-compatible AI client can drive the same actions conversationally.
- **REST API** (`apps/api`) — Express layer over the SDK for a real frontend
  or third party to integrate without touching wallets/signing directly.
- **Agentic tool** (`apps/agent`) — the standalone fleet agent process:
  polls for booking requests, checks each one against its RAMS mandate
  before accepting, executes the x402 settlement, posts feedback after the
  rental. This is the demo centerpiece.

---

## 5. Open question to resolve before deep RAMS work

The sandbox `prepare-transactions` method enum documented so far lists
tokenization methods and `agent*` (ERC-8004) methods, but no RAMS-specific
(ERC-8226) methods. RAMS is a very recent draft standard (submitted April
2026). Before building the mandate step against a real endpoint:

- Ask in Brickken's `#tech-chat` Discord: does sandbox expose any RAMS
  methods yet, or a reference contract to call directly?
- **Fallback if not:** implement mandate scope/cap/expiry checks in the
  fleet agent itself, following the ERC-8226 spec's model (principal,
  scoped/time-bounded/financially-capped authority), and disclose in the
  README that this is a client-side enforcement of the RAMS pattern pending
  Brickken's own endpoint. This is still original and on-theme even if the
  on-chain RAMS registry isn't callable yet.

---

## 6. Submission checklist (from campaign rules)

- [ ] Working implementation, runs against `api.sandbox.brickken.com`
- [ ] Public repo (this one) + README explaining what it does and how to run it
- [ ] README declares which surfaces (REST, MCP, CLI) and which methods were called
- [ ] Real, verifiable sandbox calls — chainId + transaction hashes included
- [ ] 2–3 min demo recording or a live URL
- [ ] EVM wallet address for potential reward
- [ ] AI tool usage disclosed
- [ ] Posted in Discord `#submit-your-builds` AND emailed to `build@brickken.com`
- [ ] Before Sep 17, 23:59 CET

---

## 7. Repo layout

```
carkken/
  docs/
    PROJECT_BRIEF.md        <- this file
  packages/
    sdk/                    <- Brickken client + car-domain SDK
  apps/
    cli-mcp/                <- CLI + MCP server (shared command handlers)
    api/                    <- REST API over the SDK
    agent/                  <- autonomous fleet agent process
```
