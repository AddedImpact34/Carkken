import "@carkken/sdk/dist/env";
import express from "express";
import * as path from "path";
import { VehicleStatus, Vehicle, BrickkenClient, registerFleetAgent, leaveFeedback } from "@carkken/sdk";
import { Wallet } from "ethers";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const vehicles: Vehicle[] = [
  { tokenSymbol: "CKTSL", name: "Tesla Model 3", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.OFFERING_LIVE, ratePerHour: "5" },
  { tokenSymbol: "CKCOR", name: "Toyota Corolla", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.LISTED_FOR_RENT, ratePerHour: "2" },
  { tokenSymbol: "CKTRN", name: "Ford Transit", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.BOOKED, ratePerHour: "4" },
  { tokenSymbol: "CKBMW", name: "BMW X5", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.TOKENIZED, ratePerHour: "6" },
];

app.get("/vehicles", (req, res) => {
  const { status } = req.query;
  const filtered = status ? vehicles.filter((v) => v.status === status) : vehicles;
  res.json(filtered);
});

app.get("/marketplace/invest", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.OFFERING_LIVE));
});

app.get("/marketplace/rent", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.LISTED_FOR_RENT));
});

app.get("/bookings/active", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.BOOKED));
});

app.get("/fleet/performance", (_req, res) => {
  res.json(vehicles.map((v) => ({ tokenSymbol: v.tokenSymbol, dividends: [] })));
});

app.post("/vehicles/:tokenSymbol/book", (req, res) => {
  const paymentProof = req.header("X-Payment");
  const vehicle = vehicles.find((v) => v.tokenSymbol === req.params.tokenSymbol);

  if (!vehicle || vehicle.status !== VehicleStatus.LISTED_FOR_RENT) {
    return res.status(404).json({ error: "Vehicle not available for rent" });
  }
  if (!paymentProof) {
    return res.status(402).json({
      amount: vehicle.ratePerHour,
      asset: "USDC",
      chainId: process.env.CHAIN_ID || "aa36a7",
      payTo: process.env.SIGNER_ADDRESS,
    });
  }
  vehicle.status = VehicleStatus.BOOKED;
  res.json({ ok: true, vehicle });
});

function fleetClient() {
  return new BrickkenClient({
    apiKey: process.env.BRICKKEN_API_KEY,
    baseUrl: process.env.BRICKKEN_BASE_URL || "https://api.sandbox.brickken.com",
    wallet: new Wallet(process.env.PRIVATE_KEY!),
    chainId: process.env.CHAIN_ID || "aa36a7",
  });
}

function renterWallet() {
  return new Wallet(process.env.INVESTOR_PRIVATE_KEY!);
}

const FLEET_AGENT_ID = "10306";

app.post("/actions/register-agent", async (_req, res) => {
  try {
    const stamp = Date.now();
    const result = await registerFleetAgent(fleetClient(), process.env.SIGNER_ADDRESS!, {
      name: `Carkken Fleet Agent ${stamp}`,
      description: "Live demo registration triggered from the site.",
      image: "https://images.unsplash.com/photo-1572191267337-c1705e46645c?w=400",
      services: [{ name: "car-rental", endpoint: "https://github.com/AddedImpact34/Carkken#booking" }],
    });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post("/actions/give-feedback", async (_req, res) => {
  try {
    const client = new BrickkenClient({
      apiKey: process.env.BRICKKEN_API_KEY,
      baseUrl: process.env.BRICKKEN_BASE_URL || "https://api.sandbox.brickken.com",
      wallet: renterWallet(),
      chainId: process.env.CHAIN_ID || "aa36a7",
    });
    const result = await leaveFeedback(client, renterWallet().address, {
      agentId: FLEET_AGENT_ID,
      score: 5,
      comment: `Live demo feedback at ${new Date().toISOString()}`,
    });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post("/actions/x402-demo", async (_req, res) => {
  try {
    const keylessClient = new BrickkenClient({
      baseUrl: process.env.BRICKKEN_BASE_URL || "https://api.sandbox.brickken.com",
      wallet: renterWallet(),
      chainId: process.env.CHAIN_ID || "aa36a7",
    });
    const stamp = Date.now();
    const result = await keylessClient.runMethodWithX402(
      "agentRegister",
      {
        signerAddress: renterWallet().address,
        name: `Carkken x402 Test Agent ${stamp}`,
        description: "Registered via a real signed x402 payment, no API key used.",
        image: "https://images.unsplash.com/photo-1559385988-439b04de16f8?w=400",
        services: [{ name: "x402-test", endpoint: "https://github.com/AddedImpact34/Carkken#x402" }],
      },
      renterWallet()
    );
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Carkken API listening on :${port}`));
