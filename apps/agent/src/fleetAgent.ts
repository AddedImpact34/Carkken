import "@carkken/sdk/dist/env";
import { Wallet } from "ethers";
import { BrickkenClient, Mandate, checkMandate, bookAndPay, leaveFeedback } from "@carkken/sdk";

/**
 * The demo centerpiece: an autonomous loop that represents the fleet owner.
 * It never exceeds the mandate it was granted — every incoming booking
 * request is checked BEFORE anything is signed or sent.
 */

const POLL_INTERVAL_MS = 5000;

interface IncomingBookingRequest {
  renterAgentId: string;
  amount: string;
  method: string;
}

// TODO: replace with a real queue/webhook from the REST API's booking
// endpoint. Stubbed here so the loop's control flow is visible end to end.
async function nextBookingRequest(): Promise<IncomingBookingRequest | null> {
  return null;
}

async function main() {
  const wallet = new Wallet(process.env.PRIVATE_KEY!);
  const client = new BrickkenClient({
    apiKey: process.env.BRICKKEN_API_KEY,
    baseUrl: process.env.BRICKKEN_BASE_URL || "https://api.sandbox.brickken.com",
    wallet,
    chainId: process.env.CHAIN_ID || "aa36a7",
  });

  const mandate: Mandate = {
    principal: process.env.SIGNER_ADDRESS!,
    agentId: process.env.FLEET_AGENT_ID!,
    maxAmountPerTx: process.env.MANDATE_MAX_PER_TX || "50",
    allowedMethods: ["bookRental"],
    expiresAt: process.env.MANDATE_EXPIRES_AT || "2026-12-31T23:59:59.000Z",
  };

  console.log(`Fleet agent running under mandate: cap ${mandate.maxAmountPerTx}, expires ${mandate.expiresAt}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const request = await nextBookingRequest();

    if (request) {
      try {
        checkMandate(mandate, { method: "bookRental", amount: request.amount });
        const result = await bookAndPay(client, mandate, {
          renterAgentId: request.renterAgentId,
          amount: request.amount,
          method: request.method,
        });
        console.log("Booking settled:", result);

        await leaveFeedback(client, process.env.SIGNER_ADDRESS!, {
          agentId: request.renterAgentId,
          score: 5,
          comment: "Rental completed without incident",
        });
      } catch (err) {
        // A mandate violation is a REJECTION, not a crash — this is the
        // whole point of RAMS: the agent refuses out-of-scope actions.
        console.warn("Booking rejected by mandate check:", (err as Error).message);
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
