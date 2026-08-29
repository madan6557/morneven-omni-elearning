import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const fromRoot = fs.existsSync(path.resolve(cwd, "packages/db/prisma/schema.prisma"));
// `pnpm --filter @repo/db exec` runs Prisma from packages/db, while the
// service-local command runs from apps/api.
const schema = fromRoot ? "prisma/schema.prisma" : "../../packages/db/prisma/schema.prisma";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = fromRoot
  ? ["--filter", "@repo/db", "exec", "prisma", "db", "push", `--schema=${schema}`, "--skip-generate"]
  : ["exec", "prisma", "db", "push", `--schema=${schema}`, "--skip-generate"];

const run = () => new Promise((resolve) => {
  const child = spawn(pnpm, args, { cwd, stdio: "inherit", shell: false });
  child.on("error", () => resolve(1));
  child.on("exit", (code) => resolve(code ?? 1));
});

const maxAttempts = 12;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`Prisma database setup attempt ${attempt}/${maxAttempts}...`);
  if (await run() === 0) {
    console.log("Prisma database setup completed.");
    process.exit(0);
  }
  if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 5000));
}

console.error("Prisma database setup failed after waiting for the Railway database.");
process.exit(1);
