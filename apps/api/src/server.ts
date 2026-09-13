import "dotenv/config";
import express from "express";
import { VehicleStatus, Vehicle } from "@carkken/sdk";

const app = express();
app.use(express.json());

// In-memory store for the scaffold. Swap for a real DB once the sandbox
// lifecycle calls are wired in (see docs/PROJECT_BRIEF.md section 3).
const vehicles: Vehicle[] = [];

app.get("/vehicles", (req, res) => {
  const { status } = req.query;
  const filtered = status ? vehicles.filter((v) => v.status === status) : vehicles;
  res.json(filtered);
});

// 1. Investment marketplace: vehicles with a live STO
app.get("/marketplace/invest", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.OFFERING_LIVE));
});

// 2. Rental marketplace: vehicles available to book
app.get("/marketplace/rent", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.LISTED_FOR_RENT));
});

// 3. Live bookings: vehicles currently out on rent
app.get("/bookings/active", (_req, res) => {
  res.json(vehicles.filter((v) => v.status === VehicleStatus.BOOKED));
});

// 4. Fleet performance: dividend history per vehicle (stubbed for now —
// backed by GET /get-dividend-distribution once wired to the SDK)
app.get("/fleet/performance", (_req, res) => {
  res.json(vehicles.map((v) => ({ tokenSymbol: v.tokenSymbol, dividends: [] })));
});

/**
 * x402-gated booking endpoint: a renter agent hits this without payment,
 * gets a 402 with the price/asset/chain, pays, and retries with proof.
 * This is our OWN x402 surface (separate from any x402 calls the fleet
 * agent makes back to Brickken's agentic methods).
 */
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

  // TODO: verify paymentProof against the facilitator before confirming.
  vehicle.status = VehicleStatus.BOOKED;
  res.json({ ok: true, vehicle });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Carkken API listening on :${port}`));
