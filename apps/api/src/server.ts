import "@carkken/sdk/dist/env";
import express from "express";
import * as path from "path";
import { VehicleStatus, Vehicle } from "@carkken/sdk";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const vehicles: Vehicle[] = [
  { tokenSymbol: "TESLA", name: "Tesla Model 3", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.OFFERING_LIVE, ratePerHour: "5" },
  { tokenSymbol: "COROL", name: "Toyota Corolla", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.LISTED_FOR_RENT, ratePerHour: "2" },
  { tokenSymbol: "TRANS", name: "Ford Transit", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.BOOKED, ratePerHour: "4" },
  { tokenSymbol: "BMWX", name: "BMW X5", tokenizerEmail: "addedimpact.org@gmail.com", supplyCap: "1000", status: VehicleStatus.TOKENIZED, ratePerHour: "6" },
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

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Carkken API listening on :${port}`));
