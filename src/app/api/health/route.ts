import { NextResponse } from "next/server";
import { settings } from "@/services/repository";
export async function GET() {
  try {
    await settings();
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
