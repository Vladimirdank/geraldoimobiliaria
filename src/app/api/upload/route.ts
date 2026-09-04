import { NextResponse } from "next/server";
import { requireAdmin, sameOrigin } from "@/lib/auth";
import { cloud, supabase } from "@/lib/supabase";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export async function POST(req: Request) {
  try {
    await sameOrigin();
    await requireAdmin();
    const data = await req.formData();
    const file = data.get("file");
    if (
      !(file instanceof File) ||
      file.size > 12 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      )
    )
      return NextResponse.json(
        { error: "Envie JPG, PNG, WebP ou AVIF de até 12 MB." },
        { status: 400 },
      );
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const name = `${crypto.randomUUID()}.webp`;
    let url;
    if (cloud()) {
      const c = await supabase();
      const { error } = await c.storage
        .from("property-images")
        .upload(name, buffer, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      url = c.storage.from("property-images").getPublicUrl(name).data.publicUrl;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), buffer);
      url = "/uploads/" + name;
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível enviar a foto. Verifique a imagem e sua sessão.",
      },
      { status: 400 },
    );
  }
}
