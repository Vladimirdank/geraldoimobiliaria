import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
if (
  !process.env.LOCAL_ADMIN_PASSWORD ||
  process.env.LOCAL_ADMIN_PASSWORD.length < 12
)
  throw new Error("Defina LOCAL_ADMIN_PASSWORD com pelo menos 12 caracteres.");
const db = new DatabaseSync("data/geraldo.db");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(process.env.LOCAL_ADMIN_PASSWORD, salt, 64).toString(
  "hex",
);
db.prepare("UPDATE profiles SET password_hash=?,salt=? WHERE email=?").run(
  hash,
  salt,
  process.env.LOCAL_ADMIN_EMAIL || "admin@geraldo.local",
);
db.exec("DELETE FROM sessions");
console.log("Senha redefinida e sessões locais revogadas.");
