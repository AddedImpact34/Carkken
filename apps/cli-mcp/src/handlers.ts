import "@carkken/sdk/dist/env";
import { Wallet } from "ethers";
import {
  BrickkenClient,
  tokenizeVehicle,
  whitelistInvestor,
  launchLeaseOffering,
  registerFleetAgent,
  bookAndPay,
  leaveFeedback,
  Mandate,
  checkMandate,
} from "@carkken/sdk";

/**
 * Every command lives here exactly once. cli.ts wraps these with commander
 * flags; mcp-server.ts wraps the same functions as MCP tools. Neither file
 * duplicates Brickken logic — this is the "merge CLI + MCP" point.
 */
function client() {
  const wallet = new Wallet(process.env.PRIVATE_KEY!);
  return new BrickkenClient({
    apiKey: process.env.BRICKKEN_API_KEY,
    baseUrl: process.env.BRICKKEN_BASE_URL || "https://api.sandbox.brickken.com",
    wallet,
    chainId: process.env.CHAIN_ID || "aa36a7",
    mock: process.env.MOCK_MODE === "true",
  });
}

export async function handleTokenize(args: {
  tokenSymbol: string;
  name: string;
  tokenizerEmail: string;
  supplyCap: string;
}) {
  return tokenizeVehicle(client(), process.env.SIGNER_ADDRESS!, args);
}

export async function handleWhitelist(args: {
  tokenSymbol: string;
  investorAddress: string;
  investorEmail: string;
}) {
  return whitelistInvestor(
    client(),
    process.env.SIGNER_ADDRESS!,
    args.tokenSymbol,
    args.investorAddress,
    args.investorEmail
  );
}

export async function handleLaunchOffering(args: {
  tokenizerEmail: string;
  tokenSymbol: string;
  tokenAmount: string;
  offeringName: string;
  startDate: string;
  endDate: string;
  acceptedCoin: "USDT" | "USDC" | "BKN";
  minRaiseUSD: string;
  maxRaiseUSD: string;
  minInvestment: string;
  maxInvestment: string;
}) {
  return launchLeaseOffering(client(), process.env.SIGNER_ADDRESS!, args);
}

export async function handleAgentRegister(args: {
  name: string;
  description: string;
  image: string;
  services: string[];
}) {
  return registerFleetAgent(client(), process.env.SIGNER_ADDRESS!, args);
}

export async function handleMandateIssue(args: Mandate) {
  // No Brickken endpoint confirmed yet for RAMS — validate shape locally
  // and persist it wherever the agent process reads mandates from.
  checkMandate(args, { method: args.allowedMethods[0], amount: "0" });
  return { ok: true, mandate: args };
}

export async function handleRentBook(args: {
  mandate: Mandate;
  renterAgentId: string;
  amount: string;
  method: string;
}) {
  return bookAndPay(client(), args.mandate, {
    renterAgentId: args.renterAgentId,
    amount: args.amount,
    method: args.method,
  });
}

export async function handleFeedback(args: { agentId: string; score: number; comment: string }) {
  return leaveFeedback(client(), process.env.SIGNER_ADDRESS!, args);
}
