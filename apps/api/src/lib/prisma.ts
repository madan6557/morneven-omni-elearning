import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
// ponytail: resolve sqlite file: path relative to workspace root for team portability
if (process.env.DATABASE_URL?.startsWith("file:")) {
  const raw = process.env.DATABASE_URL.slice(5);
  // try resolve relative to cwd, then to workspace root
  const candidates = [
    path.resolve(process.cwd(), raw.replace(/^\.\//, "")),
    path.resolve(process.cwd(), "../../packages/db/prisma/dev.db"),
    path.resolve("packages/db/prisma/dev.db"),
    path.resolve("E:/UVAYA/Project/ELearning/packages/db/prisma/dev.db"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { process.env.DATABASE_URL = "file:" + c; break; }
  }
}
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
