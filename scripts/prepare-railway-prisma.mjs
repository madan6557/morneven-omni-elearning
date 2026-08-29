import fs from "node:fs";
import path from "node:path";

// Railway uses PostgreSQL while local development uses SQLite. This script is
// intentionally idempotent and only runs inside Railway's ephemeral build/
// deploy workspace; it keeps the checked-in local schema unchanged.
const root = process.cwd();
const repoRoot = fs.existsSync(path.resolve(root, "packages/db/prisma/schema.prisma"))
  ? root
  : path.resolve(root, "../..");
const schemaPath = path.resolve(repoRoot, "packages/db/prisma/schema.prisma");
const lockPath = path.resolve(repoRoot, "packages/db/prisma/migrations/migration_lock.toml");

const schema = fs.readFileSync(schemaPath, "utf8");
fs.writeFileSync(schemaPath, schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));

if (fs.existsSync(lockPath)) {
  const lock = fs.readFileSync(lockPath, "utf8");
  fs.writeFileSync(lockPath, lock.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));
}

console.log("Prepared Prisma schema for Railway PostgreSQL.");
