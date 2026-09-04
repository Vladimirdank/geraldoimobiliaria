import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { supabase, cloud } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType;
  const code = url.searchParams.get("code");
  if (cloud()) {
    const c = await supabase();
    if (code) {
      const { error } = await c.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/admin/reset", url));
    }
    if (token_hash && type === "recovery") {
      const { error } = await c.auth.verifyOtp({ token_hash, type });
      if (!error) return NextResponse.redirect(new URL("/admin/reset", url));
    }
  }
  return NextResponse.redirect(new URL("/admin/login", url));
}
