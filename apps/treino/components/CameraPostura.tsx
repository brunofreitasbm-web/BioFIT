"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, SwitchCamera, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";

// Captura da foto para a avaliação postural. A pessoa está sozinha: apoia o celular, aperta o
// disparo com contagem de 10 s e se posiciona. A prévia da câmera frontal é espelhada só na
// tela; o quadro capturado fica como a câmera vê (o detector distingue esquerda e direita
// pelo corpo, e espelhar trocaria os lados). Alternativa: escolher uma foto já tirada.

export interface FotoCapturada {
  src: string; // object URL (quem recebe revoga)
  largura: number;
  altura: number;
}

const CONTAGEM_S = 10;

export function CameraPostura({ silhueta, aoCapturar }: { silhueta: "perfil" | "frontal"; aoCapturar: (foto: FotoCapturada) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [erro, setErro] = useState<string | null>(null);
  const [contagem, setContagem] = useState<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;
    setErro(null);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
      } catch {
        if (!cancelado) setErro("Sem acesso à câmera. Permita o uso da câmera ou escolha uma foto da galeria.");
      }
    })();
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    if (contagem === null) return;
    if (contagem === 0) {
      disparar();
      setContagem(null);
      return;
    }
    const t = setTimeout(() => setContagem((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contagem]);

  function disparar() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) aoCapturar({ src: URL.createObjectURL(blob), largura: canvas.width, altura: canvas.height });
    }, "image/jpeg", 0.92);
    if (navigator.vibrate) navigator.vibrate(60);
  }

  function escolherArquivo(arquivo: File) {
    const src = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => aoCapturar({ src, largura: img.naturalWidth, altura: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(src);
      setErro("Não deu para abrir essa imagem.");
    };
    img.src = src;
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-base-950">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100")}
        />
        {/* Silhueta-guia: ajuda a repetir distância e enquadramento entre sessões. */}
        <svg viewBox="0 0 90 160" className="pointer-events-none absolute inset-0 h-full w-full opacity-60" aria-hidden="true">
          {silhueta === "frontal" ? (
            <g fill="none" stroke="#fff" strokeWidth={0.8} strokeDasharray="2 2">
              <circle cx={45} cy={22} r={8} />
              <path d="M30 36 h30 l5 40 h-6 v60 h-8 v-45 h-12 v45 h-8 v-60 h-6 z" />
            </g>
          ) : (
            <g fill="none" stroke="#fff" strokeWidth={0.8} strokeDasharray="2 2">
              <circle cx={45} cy={22} r={8} />
              <path d="M38 36 c-6 10 -6 30 -2 44 l-1 55 h7 l2 -50 l3 50 h7 l-1 -58 c4 -14 3 -32 -2 -41 z" />
            </g>
          )}
          <line x1={45} y1={4} x2={45} y2={156} stroke="#fff" strokeWidth={0.4} strokeDasharray="1 2" />
        </svg>
        {contagem !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="font-display text-8xl font-extrabold text-white drop-shadow-lg tabular-nums">{contagem}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          className="toque absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white"
          aria-label="Trocar câmera"
        >
          <SwitchCamera size={ICON.md} aria-hidden="true" />
        </button>
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setContagem(CONTAGEM_S)}
          disabled={contagem !== null || Boolean(erro)}
          className="toque flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-on-solid shadow-sm disabled:opacity-50"
        >
          <Timer size={ICON.md} aria-hidden="true" /> Disparar em {CONTAGEM_S} s
        </button>
        <button
          type="button"
          onClick={disparar}
          disabled={contagem !== null || Boolean(erro)}
          className="toque flex h-12 w-12 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted disabled:opacity-50"
          aria-label="Disparar agora"
        >
          <Camera size={ICON.md} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="toque flex h-12 w-12 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted"
          aria-label="Escolher foto da galeria"
        >
          <ImageIcon size={ICON.md} aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) escolherArquivo(arquivo);
          }}
        />
      </div>
    </div>
  );
}
