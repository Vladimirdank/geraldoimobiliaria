// Keep multipart requests comfortably below Vercel's 4.5 MB ceiling.
export async function prepareImage(file: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw new Error("Use JPG, PNG, WebP ou AVIF.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error("A foto original deve ter até 12 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível ler esta foto. Tente salvar como JPG.");
  }
  try {
    const ratio = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Seu navegador não conseguiu preparar a foto.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84),
    );
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error(
        "Esta foto continua muito grande. Escolha uma versão menor.",
      );
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: blob.type,
    });
  } finally {
    bitmap.close();
  }
}
