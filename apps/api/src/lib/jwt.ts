import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "dev-secret-please-change-32chars-long";
export function signToken(payload: { id: string; nim: string; role: string; tokenVersion?: number }) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { id: string; nim: string; role: string; tokenVersion?: number };
}
