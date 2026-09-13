import test from "node:test";
import assert from "node:assert";
import { checkMandate } from "../dist/agent.js";

const mandate = {
  principal: "0xowner",
  agentId: "agent-1",
  maxAmountPerTx: "50",
  allowedMethods: ["bookRental"],
  expiresAt: "2099-01-01T00:00:00.000Z",
};

test("allows a booking within cap and allowed method", () => {
  assert.strictEqual(checkMandate(mandate, { method: "bookRental", amount: "20" }), true);
});

test("rejects a booking over the cap", () => {
  assert.throws(() => checkMandate(mandate, { method: "bookRental", amount: "999" }), /cap exceeded/);
});

test("rejects a method not in allowedMethods", () => {
  assert.throws(() => checkMandate(mandate, { method: "sellVehicle", amount: "1" }), /does not authorize/);
});

test("rejects an expired mandate", () => {
  const expired = { ...mandate, expiresAt: "2000-01-01T00:00:00.000Z" };
  assert.throws(() => checkMandate(expired, { method: "bookRental", amount: "1" }), /expired/);
});
