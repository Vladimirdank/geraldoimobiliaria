"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Grid2X2, Share2 } from "lucide-react";
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  const show = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  return (
    <>
      <div className="gallery">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => show(i)}
            aria-label={`Ampliar foto ${i + 1} de ${title}`}
          >
            <Image
              src={src}
              alt={`${title} — ambiente ${i + 1}`}
              fill
              sizes={i === 0 ? "(max-width: 700px) 100vw, 60vw" : "25vw"}
              priority={i === 0}
            />
          </button>
        ))}
        <button className="gallery-all" onClick={() => show(0)}>
          <Grid2X2 size={17} />
          Ver todas as fotos ({images.length})
        </button>
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        onClose={() => setZoom(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setIndex((index + 1) % images.length);
          if (e.key === "ArrowLeft")
            setIndex((index - 1 + images.length) % images.length);
        }}
      >
        <button
          className="lightbox-close"
          onClick={() => dialog.current?.close()}
          aria-label="Fechar galeria"
        >
          <X />
        </button>
        <span>
          {index + 1} / {images.length} · Clique na foto para ampliar
        </span>
        <div className="lightbox-stage">
          <button
            aria-label="Foto anterior"
            onClick={() => {
              setZoom(false);
              setIndex((index - 1 + images.length) % images.length);
            }}
          >
            <ChevronLeft />
          </button>
          <div className={zoom ? "zoomed" : ""} onClick={() => setZoom(!zoom)}>
            <img src={images[index]} alt={`${title} — foto ${index + 1}`} />
          </div>
          <button
            aria-label="Próxima foto"
            onClick={() => {
              setZoom(false);
              setIndex((index + 1) % images.length);
            }}
          >
            <ChevronRight />
          </button>
        </div>
      </dialog>
    </>
  );
}
export function ShareButton({ title }: { title: string }) {
  const [label, setLabel] = useState("Compartilhar");
  return (
    <button
      className="text-button"
      onClick={async () => {
        try {
          if (navigator.share)
            await navigator.share({ title, url: location.href });
          else {
            await navigator.clipboard.writeText(location.href);
            setLabel("Link copiado");
          }
        } catch {
          setLabel("Compartilhar");
        }
      }}
    >
      <Share2 size={17} />
      {label}
    </button>
  );
}
