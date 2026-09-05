import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace, leadDetail } from "@/services/admin-workspace";
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const data = params.has("lead")
      ? await leadDetail(z.uuid().parse(params.get("lead")))
      : await getWorkspace(Object.fromEntries(params));
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          (e as Error).message === "UNAUTHORIZED"
            ? "Sessão expirada. Entre novamente."
            : "Não foi possível carregar os dados.",
      },
      { status: (e as Error).message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
