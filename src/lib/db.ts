import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
let instance: DatabaseSync;
export function db() {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.ALLOW_LOCAL_PRODUCTION
  )
    throw new Error(
      "Configure Supabase para produção ou autorize explicitamente um servidor local persistente.",
    );
  if (!instance) {
    mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
    instance = new DatabaseSync(path.join(process.cwd(), "data", "geraldo.db"));
    instance.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  }
  return instance;
}
