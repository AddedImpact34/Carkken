import { BrickkenClient } from "./client";

export enum VehicleStatus {
  DRAFT = "DRAFT",
  TOKENIZING = "TOKENIZING",
  OFFERING_LIVE = "OFFERING_LIVE",
  TOKENIZED = "TOKENIZED",
  LISTED_FOR_RENT = "LISTED_FOR_RENT",
  BOOKED = "BOOKED",
  IN_MAINTENANCE = "IN_MAINTENANCE",
  RETIRED = "RETIRED",
}

export interface Vehicle {
  tokenSymbol: string; // 2-5 uppercase letters/numbers, per Brickken constraint
  name: string;
  tokenizerEmail: string;
  supplyCap: string;
  status: VehicleStatus;
  ratePerHour?: string; // sandbox demo unit, e.g. testnet USDC
  fleetAgentId?: string; // ERC-8004 agent id operating this vehicle
}

/** Step 1 of the loop: investors tokenize the vehicle as a uRWA asset. */
export async function tokenizeVehicle(
  client: BrickkenClient,
  signerAddress: string,
  vehicle: Pick<Vehicle, "tokenSymbol" | "name" | "tokenizerEmail" | "supplyCap">
) {
  return client.runMethod("newTokenization", {
    signerAddress,
    tokenizerEmail: vehicle.tokenizerEmail,
    name: vehicle.name,
    tokenSymbol: vehicle.tokenSymbol,
    tokenType: "RWA_TOKEN",
    supplyCap: vehicle.supplyCap,
  });
}

export async function whitelistInvestor(
  client: BrickkenClient,
  signerAddress: string,
  tokenSymbol: string,
  investorAddress: string,
  investorEmail: string
) {
  return client.runMethod("whitelist", {
    signerAddress,
    tokenSymbol,
    userToWhitelist: [{ investorAddress, investorEmail, whitelistStatus: true }],
  });
}

/** Opens the STO so fractional investors can newInvest. */
export async function launchLeaseOffering(
  client: BrickkenClient,
  signerAddress: string,
  params: {
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
  }
) {
  return client.runMethod("newSto", { signerAddress, ...params });
}

/** Closes the loop: rental revenue collected by the fleet agent is paid to token holders. */
export async function distributeDividends(
  client: BrickkenClient,
  signerAddress: string,
  tokenSymbol: string,
  amount: string
) {
  return client.runMethod("dividendDistribution", { signerAddress, tokenSymbol, amount });
}
