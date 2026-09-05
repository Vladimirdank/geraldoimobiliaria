import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, rateLimit } from "@/lib/auth";
import { saveLead, properties } from "@/services/repository";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[+\d\s()\-]{10,20}$/),
  email: z.union([z.email(), z.literal("")]).default(""),
  property_id: z.uuid().nullable().default(null),
  origin: z.enum(["contato", "imovel", "proprietario"]),
  message: z.string().max(3000).default(""),
  consent: z.literal("on"),
  website: z.string().max(0).optional(),
  utms: z.record(z.string().max(50), z.string().max(300)).default({}),
});
export async function POST(req: Request) {
  try {
    await sameOrigin();
    if (Number(req.headers.get("content-length") || 0) > 16000)
      return NextResponse.json(
        { error: "Mensagem muito longa." },
        { status: 413 },
      );
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Confira nome, telefone e consentimento." },
        { status: 400 },
      );
    const p = parsed.data;
    if (!rateLimit("lead:" + p.phone, 4))
      return NextResponse.json(
        {
          error:
            "Você já enviou algumas solicitações. Tente novamente em 15 minutos.",
        },
        { status: 429 },
      );
    if (
      p.property_id &&
      !(await properties()).some((x) => x.id === p.property_id)
    )
      return NextResponse.json(
        { error: "Imóvel indisponível." },
        { status: 400 },
      );
    await saveLead({
      id: crypto.randomUUID(),
      name: p.name,
      phone: p.phone,
      email: p.email,
      property_id: p.property_id,
      origin: p.origin,
      message: p.message,
      status: "Novo",
      utms: p.utms,
      created_at: new Date().toISOString(),
      consent_at: new Date().toISOString(),
      consent_version: "contact-2026-09-v1",
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível enviar agora. Tente novamente." },
      { status: 400 },
    );
  }
}
