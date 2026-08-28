import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "../src/lib/jwt.js";
import { getContentAvailability } from "../src/lib/contentAvailability.js";

test("JWT round-trip keeps identity and token version", () => {
  const token = signToken({ id: "user-1", nim: "20250001", role: "MAHASISWA", tokenVersion: 3 });
  const payload = verifyToken(token);
  assert.equal(payload.id, "user-1");
  assert.equal(payload.nim, "20250001");
  assert.equal(payload.role, "MAHASISWA");
  assert.equal(payload.tokenVersion, 3);
  assert.ok(payload.exp && payload.iat);
});

test("invalid JWT is rejected", () => {
  assert.throws(() => verifyToken("not-a-token"));
});

test("content availability distinguishes manual and scheduled access", () => {
  const now = new Date("2026-08-28T00:00:00.000Z");
  assert.equal(getContentAvailability({ id: "a", title: "A", isOpen: false }, now), "NOT_OPEN_MANUALLY");
  assert.equal(getContentAvailability({ id: "b", title: "B", availableFrom: "2026-08-28T01:00:00.000Z" }, now), "NOT_STARTED");
  assert.equal(getContentAvailability({ id: "c", title: "C", availableUntil: "2026-08-27T23:00:00.000Z" }, now), "ACCESS_ENDED");
  assert.equal(getContentAvailability({ id: "d", title: "D", isOpen: true }, now), "AVAILABLE");
});
