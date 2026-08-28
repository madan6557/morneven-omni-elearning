import jwt from "jsonwebtoken";
const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) throw new Error("JWT_SECRET production wajib diisi dan minimal 32 karakter.");
const SECRET = configuredSecret || "dev-secret-please-change-32chars-long";
export function signToken(payload: { id: string; nim: string; role: string; tokenVersion?: number }) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { id: string; nim: string; role: string; tokenVersion?: number };
}
