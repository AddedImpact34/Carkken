import { Wallet } from "ethers";

export interface BrickkenClientConfig {
  apiKey?: string;
  baseUrl: string;
  wallet: Wallet;
  chainId: string; // hex, e.g. "aa36a7" for Sepolia
  mock?: boolean; // simulate the sandbox locally, no network calls
}

export interface PreparedTx {
  txId: string;
  transactions: Record<string, unknown>[];
  info?: Record<string, unknown>;
}

function fakeHash() {
  return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/**
 * Thin wrapper around Brickken's prepare -> sign -> send -> poll lifecycle.
 * This is the ONLY place in the codebase that talks to Brickken directly.
 * Set config.mock = true (or MOCK_MODE=true in .env) to simulate the whole
 * loop locally before a real sandbox key exists.
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

  async prepare(method: string, body: Record<string, unknown>): Promise<PreparedTx> {
    if (this.cfg.mock) {
      return {
        txId: fakeHash(),
        transactions: [{ mock: true, method, ...body }],
        info: { method, mock: true },
      };
    }

    const res = await fetch(`${this.cfg.baseUrl}/prepare-transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ method, chainId: this.cfg.chainId, ...body }),
    });

    if (res.status === 402) {
      const requirements = await res.json();
      throw new X402PaymentRequiredError(requirements);
    }
    if (!res.ok) {
      throw new Error(`prepare-transactions failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    const transactions = Array.isArray(json.transactions) ? json.transactions : [json.transactions];
    return { ...json, transactions } as PreparedTx;
  }

  async prepareWithPayment(
    method: string,
    body: Record<string, unknown>,
    xPaymentHeader: string
  ): Promise<PreparedTx> {
    if (this.cfg.mock) {
      return { txId: fakeHash(), transactions: [{ mock: true, method, paid: true, ...body }] };
    }
    const res = await fetch(`${this.cfg.baseUrl}/prepare-transactions`, {
      method: "POST",
      headers: this.headers({ "X-Payment": xPaymentHeader }),
      body: JSON.stringify({ method, chainId: this.cfg.chainId, ...body }),
    });
    if (!res.ok) {
      throw new Error(`prepare-transactions (paid retry) failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    const transactions = Array.isArray(json.transactions) ? json.transactions : [json.transactions];
    return { ...json, transactions } as PreparedTx;
  }

  async signAll(prepared: PreparedTx): Promise<string[]> {
    if (this.cfg.mock) return prepared.transactions.map(() => fakeHash());
    return Promise.all(
      prepared.transactions.map((tx) => this.cfg.wallet.signTransaction(tx as any))
    );
  }

  async send(txId: string, signedTransactions: string[]): Promise<{ txId: string }> {
    if (this.cfg.mock) return { txId };
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

  async pollStatus(txId: string, { intervalMs = 10000, timeoutMs = 60000 } = {}) {
    if (this.cfg.mock) return { status: "confirmed", txHash: fakeHash(), txId };

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

  async runMethod(method: string, body: Record<string, unknown>) {
    const prepared = await this.prepare(method, body);
    const signed = await this.signAll(prepared);
    const sent = await this.send(prepared.txId, signed);
    const status = await this.pollStatus(prepared.txId);
    return { txId: prepared.txId, status, info: prepared.info };
  }
}

export class X402PaymentRequiredError extends Error {
  constructor(public requirements: unknown) {
    super("Payment required (402) — read amount/asset/chain from requirements before paying");
  }
}
