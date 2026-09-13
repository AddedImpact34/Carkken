import { Wallet } from "ethers";

export interface BrickkenClientConfig {
  apiKey?: string;
  baseUrl: string;
  wallet: Wallet;
  chainId: string; // hex, e.g. "aa36a7" for Sepolia
}

export interface PreparedTx {
  txId: string;
  transactions: Record<string, unknown>[];
  info?: Record<string, unknown>;
}

/**
 * Thin wrapper around Brickken's prepare -> sign -> send -> poll lifecycle.
 * This is the ONLY place in the codebase that talks to Brickken directly.
 * Everything else (vehicle.ts, agent.ts, CLI, API, agent process) calls
 * through here so behavior stays consistent across every surface.
 */
export class BrickkenClient {
  constructor(private cfg: BrickkenClientConfig) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      "Content-Type": "application/json",
      ...(this.cfg.apiKey ? { "x-api-key": this.cfg.apiKey } : {}),
      ...extra,
    };
  }

  /** POST /prepare-transactions */
  async prepare(method: string, body: Record<string, unknown>): Promise<PreparedTx> {
    const res = await fetch(`${this.cfg.baseUrl}/prepare-transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ method, chainId: this.cfg.chainId, ...body }),
    });

    if (res.status === 402) {
      // x402-eligible agentic method: caller should re-invoke with a
      // signed payment header. See client.prepareWithPayment().
      const requirements = await res.json();
      throw new X402PaymentRequiredError(requirements);
    }

    if (!res.ok) {
      throw new Error(`prepare-transactions failed (${res.status}): ${await res.text()}`);
    }
    return res.json() as Promise<PreparedTx>;
  }

  /** Re-issue a prepare call with an X-Payment header after a 402. */
  async prepareWithPayment(
    method: string,
    body: Record<string, unknown>,
    xPaymentHeader: string
  ): Promise<PreparedTx> {
    const res = await fetch(`${this.cfg.baseUrl}/prepare-transactions`, {
      method: "POST",
      headers: this.headers({ "X-Payment": xPaymentHeader }),
      body: JSON.stringify({ method, chainId: this.cfg.chainId, ...body }),
    });
    if (!res.ok) {
      throw new Error(`prepare-transactions (paid retry) failed (${res.status}): ${await res.text()}`);
    }
    return res.json() as Promise<PreparedTx>;
  }

  /** Sign every prepared transaction with the configured wallet. */
  async signAll(prepared: PreparedTx): Promise<string[]> {
    return Promise.all(
      prepared.transactions.map((tx) => this.cfg.wallet.signTransaction(tx as any))
    );
  }

  /** POST /send-transactions */
  async send(txId: string, signedTransactions: string[]): Promise<{ txId: string }> {
    const res = await fetch(`${this.cfg.baseUrl}/send-transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ txId, signedTransactions }),
    });
    if (!res.ok) {
      throw new Error(`send-transactions failed (${res.status}): ${await res.text()}`);
    }
    return res.json() as Promise<{ txId: string }>;
  }

  /** GET /get-transaction-status?txId=... — polls until mined or timeout. */
  async pollStatus(txId: string, { intervalMs = 4000, timeoutMs = 120000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(
        `${this.cfg.baseUrl}/get-transaction-status?txId=${txId}`,
        { headers: this.headers() }
      );
      const status = await res.json();
      if (status.status && status.status !== "pending") return status;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for txId ${txId} to confirm`);
  }

  /** Convenience: prepare -> sign -> send -> poll in one call. */
  async runMethod(method: string, body: Record<string, unknown>) {
    const prepared = await this.prepare(method, body);
    const signed = await this.signAll(prepared);
    const sent = await this.send(prepared.txId, signed);
    const status = await this.pollStatus(sent.txId);
    return { txId: sent.txId, status, info: prepared.info };
  }
}

export class X402PaymentRequiredError extends Error {
  constructor(public requirements: unknown) {
    super("Payment required (402) — read amount/asset/chain from requirements before paying");
  }
}
