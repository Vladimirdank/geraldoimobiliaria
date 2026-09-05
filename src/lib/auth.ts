import "server-only";
import { cookies, headers } from "next/headers";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { db } from "@/lib/db";
import { cloud, supabase } from "@/lib/supabase";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
export async function isAdmin() {
  if (cloud()) {
    const c = await supabase();
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user) return false;
    const { data } = await c
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return data?.role === "admin";
  }
  const token = (await cookies()).get("geraldo_session")?.value;
  if (!token) return false;
  return !!db()
    .prepare("SELECT user_id FROM sessions WHERE token=? AND expires_at>?")
    .get(hash(token), Date.now());
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}
export async function adminActor(): Promise<string> {
  await requireAdmin();
  if (cloud()) {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    if (!user) throw new Error("UNAUTHORIZED");
    return user.id;
  }
  const token = (await cookies()).get("geraldo_session")?.value;
  const row = db()
    .prepare("SELECT user_id FROM sessions WHERE token=? AND expires_at>?")
    .get(hash(token || ""), Date.now()) as { user_id: string } | undefined;
  if (!row) throw new Error("UNAUTHORIZED");
  return row.user_id;
}
export async function login(email: string, password: string) {
  if (cloud()) {
    const c = await supabase();
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error || !(await isAdmin())) {
      await c.auth.signOut();
      return false;
    }
    return true;
  }
  const p = db()
    .prepare("SELECT * FROM profiles WHERE email=?")
    .get(email) as any;
  const derived = scryptSync(password, p?.salt || "constant-fallback-salt", 64);
  if (!p || !timingSafeEqual(derived, Buffer.from(p.password_hash, "hex")))
    return false;
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(hash(token), p.id, Date.now() + 604800000);
  (await cookies()).set("geraldo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
  return true;
}
export async function logout() {
  if (cloud()) await (await supabase()).auth.signOut();
  else {
    const jar = await cookies();
    const t = jar.get("geraldo_session")?.value;
    if (t) db().prepare("DELETE FROM sessions WHERE token=?").run(hash(t));
    jar.delete("geraldo_session");
  }
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin || new URL(origin).host !== h.get("host"))
    throw new Error("FORBIDDEN");
}
const limits = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 10) {
  const now = Date.now();
  if (!cloud()) {
    const row = db()
      .prepare(
        "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=? THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<=? THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING count",
      )
      .get(hash(key), now + 900000, now, now) as { count: number };
    db()
      .prepare("DELETE FROM rate_limits WHERE reset_at<?")
      .run(now - 86400000);
    return row.count <= max;
  }
  const v = limits.get(key);
  if (v && v.until > now) {
    if (v.count >= max) return false;
    v.count++;
  } else {
    limits.set(key, { count: 1, until: now + 900000 });
  }
  if (limits.size > 10000)
    for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  return true;
}
