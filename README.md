# Carkken

Fractional car ownership, run by a compliance-bound autonomous agent.
Built for the Build with Brickken campaign.

Full write-up, architecture, and vehicle state model: [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md)

## Surfaces used

- REST (Brickken Dapp API — tokenization + STO + dividend lifecycle)
- MCP (Brickken's own agent identity/reputation methods, called from our agent)
- x402 (per-rental payment settlement)
- Our own: SDK, CLI, MCP server, REST API, autonomous agent (see below)

## Quickstart

```bash
cp .env.example .env
# fill in BRICKKEN_API_KEY, SIGNER_ADDRESS, PRIVATE_KEY (testnet only)
npm install
npm run build

npm run cli -- tokenize --file examples/vehicle.json
npm run api      # REST API on :4000
npm run agent    # autonomous fleet agent loop
npm run mcp      # MCP server for chat-driven control
```

## Status

Early scaffold — see `docs/PROJECT_BRIEF.md` section 5 for the open
question on RAMS (ERC-8226) sandbox support that needs resolving before the
mandate step is wired to a live endpoint.

## AI tool disclosure

Built with assistance from Claude (Anthropic) for architecture, scaffolding,
and documentation. All Brickken integration logic is reviewed and run by a
human developer before submission, per campaign rules.
