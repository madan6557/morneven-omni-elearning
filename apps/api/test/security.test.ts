import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "../src/lib/jwt.js";

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
