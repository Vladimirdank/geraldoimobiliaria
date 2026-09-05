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
    instance.function("search_text", (value) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    );
    // Additive local migration. Existing contacts and catalog entries are preserved.
    const columns = instance.prepare("PRAGMA table_info(leads)").all() as {
      name: string;
    }[];
    if (columns.length) {
      for (const [name, definition] of Object.entries({
        assignee: "TEXT NOT NULL DEFAULT ''",
        priority: "TEXT NOT NULL DEFAULT 'Normal'",
        next_action: "TEXT NOT NULL DEFAULT ''",
        next_action_at: "TEXT",
        first_contact_at: "TEXT",
        lost_reason: "TEXT NOT NULL DEFAULT ''",
        updated_at: "TEXT NOT NULL DEFAULT ''",
        consent_at: "TEXT",
        consent_version: "TEXT NOT NULL DEFAULT ''",
      }))
        if (!columns.some((c) => c.name === name))
          instance.exec(`ALTER TABLE leads ADD COLUMN ${name} ${definition}`);
      instance.exec(
        "UPDATE leads SET updated_at=created_at WHERE updated_at=''; CREATE INDEX IF NOT EXISTS leads_pipeline ON leads(status,created_at); CREATE INDEX IF NOT EXISTS leads_schedule ON leads(next_action_at);",
      );
    }
    instance.exec(`CREATE TABLE IF NOT EXISTS lead_activities(id TEXT PRIMARY KEY,lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,kind TEXT NOT NULL,body TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS lead_activity_parent ON lead_activities(lead_id,created_at);
      CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER,reset_at INTEGER);`);
  }
  return instance;
}
