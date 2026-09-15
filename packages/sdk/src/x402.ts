import { Wallet, randomBytes, hexlify } from "ethers";

export interface X402Requirement {
  scheme: string;
  network: string; // CAIP-2, e.g. "eip155:11155111"
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: {
    name: string;
    version: string;
    tokenSymbol: string;
    assetTransferMethod: string;
    chainId: string;
  };
}

/**
 * Signs an EIP-3009 TransferWithAuthorization payment and returns a ready
 * to use X-Payment header value (base64 JSON), for the "exact" x402 scheme
 * on EVM chains. Only handles assetTransferMethod "eip3009" (USDC/EURC
 * style tokens) — BKN uses Permit2, which is a separate, more involved
 * signing path not yet implemented here.
 */
export async function signX402Payment(
  wallet: Wallet,
  requirement: X402Requirement
): Promise<string> {
  if (requirement.extra.assetTransferMethod !== "eip3009") {
    throw new Error(
      `Unsupported assetTransferMethod: ${requirement.extra.assetTransferMethod}. Only eip3009 is implemented.`
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: wallet.address,
    to: requirement.payTo,
    value: requirement.amount,
    validAfter: "0",
    validBefore: String(now + requirement.maxTimeoutSeconds),
    nonce: hexlify(randomBytes(32)),
  };

  const chainIdNum = Number(requirement.extra.chainId);

  const domain = {
    name: requirement.extra.name,
    version: requirement.extra.version,
    chainId: chainIdNum,
    verifyingContract: requirement.asset,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const signature = await wallet.signTypedData(domain, types, authorization);

  const payload = {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: { authorization, signature },
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
