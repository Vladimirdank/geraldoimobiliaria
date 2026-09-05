import { NextResponse } from "next/server";
import { requireAdmin, sameOrigin, login, logout, rateLimit } from "@/lib/auth";
import {
  saveProperty,
  removeProperty,
  saveSettings,
  saveContent,
  deleteContent,
  updateLead,
} from "@/services/repository";
import { propertySchema } from "@/lib/validation";
import { cloud, supabase } from "@/lib/supabase";
import { z } from "zod";
import { publicationIssues } from "@/lib/admin-model";
import { saveWorkflow } from "@/services/admin-workspace";
export async function POST(req: Request) {
  try {
    await sameOrigin();
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 200000)
      return NextResponse.json(
        { error: "Dados muito grandes." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (body.action === "login") {
      const email = z.email().max(150).parse(body.email);
      const password = z.string().min(1).max(200).parse(body.password);
      if (!rateLimit("login:" + email.toLowerCase(), 8))
        return NextResponse.json(
          { error: "Aguarde 15 minutos antes de tentar novamente." },
          { status: 429 },
        );
      if (!(await login(email, password)))
        return NextResponse.json(
          { error: "E-mail ou senha inválidos." },
          { status: 401 },
        );
      return NextResponse.json({ ok: true });
    }
    if (body.action === "reset") {
      const email = z.email().parse(body.email);
      if (!rateLimit("reset:" + email, 3))
        throw new Error("Limite de solicitações.");
      if (!cloud())
        return NextResponse.json(
          {
            error:
              "No ambiente local, redefina a senha pelo script de administração. Recuperação por e-mail requer Supabase.",
          },
          { status: 400 },
        );
      const { error } = await (
        await supabase()
      ).auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    await requireAdmin();
    if (body.action === "logout") {
      await logout();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "password") {
      if (!cloud()) throw new Error("Disponível com Supabase.");
      const password = z.string().min(12).max(200).parse(body.password);
      const { error } = await (await supabase()).auth.updateUser({ password });
      if (error) throw error;
    } else if (body.action === "property") {
      const p = propertySchema.parse(body.property);
      const issues = p.active ? publicationIssues(p) : [];
      if (issues.length)
        return NextResponse.json({ error: issues.join(" ") }, { status: 422 });
      await saveProperty({ ...p, updated_at: new Date().toISOString() });
    } else if (body.action === "lead-workflow") {
      await saveWorkflow(body.workflow);
    } else if (body.action === "delete-property") {
      await removeProperty(z.uuid().parse(body.id));
    } else if (body.action === "settings") {
      const values = z
        .record(z.string().max(100), z.string().max(20000))
        .parse(body.settings);
      if (
        values.instagram &&
        !/^https:\/\/(www\.)?instagram\.com\//.test(values.instagram)
      )
        throw new Error("Informe uma URL válida do Instagram.");
      if (
        values.hero_image &&
        !/^https:\/\/(images\.unsplash\.com|[a-z0-9-]+\.supabase\.co)\//.test(
          values.hero_image,
        ) &&
        !values.hero_image.startsWith("/uploads/")
      )
        throw new Error("Use uma imagem enviada ou URL Unsplash/Supabase.");
      await saveSettings(values);
    } else if (body.action === "content") {
      await saveContent(
        z
          .object({
            id: z.uuid(),
            kind: z.enum([
              "faq",
              "testimonial",
              "type",
              "city",
              "neighborhood",
              "condominium",
              "feature",
            ]),
            title: z.string().min(1).max(200),
            body: z.string().max(10000),
            extra: z.string().max(1000),
            sort_order: z.number().min(0),
          })
          .parse(body.content),
      );
    } else if (body.action === "delete-content") {
      await deleteContent(z.uuid().parse(body.id));
    } else if (body.action === "lead") {
      await updateLead(
        z.uuid().parse(body.id),
        z
          .enum([
            "Novo",
            "Em atendimento",
            "Visita agendada",
            "Negociação",
            "Convertido",
            "Perdido",
          ])
          .parse(body.status),
      );
    } else if (body.action !== "password")
      throw new Error("Ação desconhecida.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = (e as Error).message;
    if (message === "CONTENT_IN_USE" || message.includes("foreign key"))
      return NextResponse.json(
        {
          error:
            "Este item está vinculado a imóveis. Edite os vínculos antes de excluir.",
        },
        { status: 409 },
      );
    if (message === "CONFLICT")
      return NextResponse.json(
        {
          error:
            "Este atendimento foi alterado em outra janela. Reabra o contato para atualizar os dados.",
        },
        { status: 409 },
      );
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(" ") },
        { status: 422 },
      );
    return NextResponse.json(
      {
        error:
          message === "UNAUTHORIZED"
            ? "Sessão expirada. Entre novamente."
            : message.includes("UNIQUE")
              ? "Já existe um imóvel com esse código ou endereço."
              : message === "FORBIDDEN"
                ? "Origem não permitida."
                : "Não foi possível salvar. Verifique os campos e tente novamente.",
      },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
