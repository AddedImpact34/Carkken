import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  handleTokenize,
  handleWhitelist,
  handleLaunchOffering,
  handleAgentRegister,
  handleMandateIssue,
  handleRentBook,
  handleFeedback,
} from "./handlers";

/**
 * Same command set as cli.ts, exposed as MCP tools so any MCP-compatible
 * client (Claude, GPT, a custom agent) can drive Carkken conversationally.
 * No Brickken logic here — everything delegates to handlers.ts.
 */
const server = new McpServer({ name: "carkken", version: "0.1.0" });

server.tool(
  "tokenize_vehicle",
  "Tokenize a vehicle as a fractional uRWA asset on Brickken sandbox",
  {
    tokenSymbol: z.string(),
    name: z.string(),
    tokenizerEmail: z.string().email(),
    supplyCap: z.string(),
  },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleTokenize(args)) }] })
);

server.tool(
  "whitelist_investor",
  "Whitelist an investor wallet for a tokenized vehicle",
  { tokenSymbol: z.string(), investorAddress: z.string(), investorEmail: z.string().email() },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleWhitelist(args)) }] })
);

server.tool(
  "launch_offering",
  "Open the STO so investors can buy fractions of the vehicle",
  {
    tokenizerEmail: z.string().email(),
    tokenSymbol: z.string(),
    tokenAmount: z.string(),
    offeringName: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    acceptedCoin: z.enum(["USDT", "USDC", "BKN"]),
    minRaiseUSD: z.string(),
    maxRaiseUSD: z.string(),
    minInvestment: z.string(),
    maxInvestment: z.string(),
  },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleLaunchOffering(args)) }] })
);

server.tool(
  "register_fleet_agent",
  "Register the fleet agent's on-chain identity (ERC-8004)",
  { name: z.string(), description: z.string(), image: z.string().url(), services: z.array(z.object({ name: z.string(), endpoint: z.string() })) },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleAgentRegister(args)) }] })
);

server.tool(
  "issue_mandate",
  "Grant the fleet agent a scoped, capped, time-bound mandate (RAMS pattern)",
  {
    principal: z.string(),
    agentId: z.string(),
    maxAmountPerTx: z.string(),
    allowedMethods: z.array(z.string()),
    expiresAt: z.string(),
  },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleMandateIssue(args)) }] })
);

server.tool(
  "book_rental",
  "Book a rental on behalf of the fleet owner, checked against the mandate, settled via x402",
  {
    mandate: z.object({
      principal: z.string(),
      agentId: z.string(),
      maxAmountPerTx: z.string(),
      allowedMethods: z.array(z.string()),
      expiresAt: z.string(),
    }),
    renterAgentId: z.string(),
    amount: z.string(),
    method: z.string(),
  },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleRentBook(args)) }] })
);

server.tool(
  "leave_feedback",
  "Leave reputation feedback on a fleet agent after a rental",
  { agentId: z.string(), score: z.number().min(0).max(5), comment: z.string() },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(await handleFeedback(args)) }] })
);

const transport = new StdioServerTransport();
server.connect(transport);
