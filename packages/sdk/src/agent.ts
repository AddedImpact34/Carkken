import { Wallet } from "ethers";
import { BrickkenClient, X402PaymentRequiredError } from "./client";
import { signX402Payment, X402Requirement } from "./x402";

/**
 * RAMS (ERC-8226) mandate model.
 *
 * NOTE: as of writing, Brickken's public prepare-transactions method enum
 * does not list RAMS-specific methods (only tokenization + agent* / ERC-8004
 * methods). Until confirmed otherwise in Discord #tech-chat, this mandate is
 * enforced CLIENT-SIDE by the fleet agent itself, following the ERC-8226
 * spec's scoped / time-bounded / financially-capped authority model. If
 * Brickken exposes a real RAMS registry method later, swap checkMandate()
 * to call it instead of the local check below.
 */
export interface Mandate {
  principal: string; // fleet owner's address — the one delegating authority
  agentId: string; // ERC-8004 agent id this mandate is granted to
  maxAmountPerTx: string; // financial cap, in the offering's payment token
  allowedMethods: string[]; // e.g. ["bookRental"]
  expiresAt: string; // ISO 8601
}

export function checkMandate(mandate: Mandate, action: { method: string; amount: string }) {
  if (!mandate.allowedMethods.includes(action.method)) {
    throw new Error(`Mandate does not authorize method: ${action.method}`);
  }
  if (Number(action.amount) > Number(mandate.maxAmountPerTx)) {
    throw new Error(
      `Mandate cap exceeded: requested ${action.amount} > cap ${mandate.maxAmountPerTx}`
    );
  }
  if (new Date(mandate.expiresAt).getTime() < Date.now()) {
    throw new Error("Mandate has expired");
  }
  return true;
}

/** Registers the fleet agent's on-chain identity (ERC-8004). */
export async function registerFleetAgent(
  client: BrickkenClient,
  signerAddress: string,
  params: { name: string; description: string; image: string; services: { name: string; endpoint: string }[] }
) {
  return client.runMethod("agentRegister", { signerAddress, ...params });
}

export async function setFleetAgentWallet(
  client: BrickkenClient,
  signerAddress: string,
  agentWallet: string
) {
  return client.runMethod("agentSetWallet", { signerAddress, agentWallet });
}

/**
 * Books a rental on behalf of the fleet owner, checking the mandate first,
 * then settling via x402. Brickken's prepare() throws X402PaymentRequiredError
 * on a 402 — the caller re-issues with a signed payment header.
 */
export async function bookAndPay(
  client: BrickkenClient,
  mandate: Mandate,
  booking: { renterAgentId: string; amount: string; method: string },
  payerWallet: Wallet
) {
  checkMandate(mandate, { method: booking.method, amount: booking.amount });

  try {
    return await client.prepare(booking.method, {
      renterAgentId: booking.renterAgentId,
      amount: booking.amount,
    });
  } catch (err) {
    if (err instanceof X402PaymentRequiredError) {
      const requirements = err.requirements as X402Requirement[];
      const eip3009Option = requirements.find(
        (r) => r.extra.assetTransferMethod === "eip3009"
      );
      if (!eip3009Option) {
        throw new Error(
          `No eip3009-compatible payment option available: ${JSON.stringify(requirements)}`
        );
      }
      const xPaymentHeader = await signX402Payment(payerWallet, eip3009Option);
      return await client.prepareWithPayment(
        booking.method,
        { renterAgentId: booking.renterAgentId, amount: booking.amount },
        xPaymentHeader
      );
    }
    throw err;
  }
}

/** Reputation: renter leaves feedback on the fleet agent after a rental. */
export async function leaveFeedback(
  client: BrickkenClient,
  signerAddress: string,
  params: { agentId: string; score: number; comment: string }
) {
  return client.runMethod("agentGiveFeedback", { signerAddress, agentId: params.agentId, value: params.score, valueDecimals: 0, comment: params.comment });
}
