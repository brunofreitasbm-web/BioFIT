"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, EyeOff, ArrowLeftRight, Image as ImageIcon, PersonStanding, SwitchCamera, Timer, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { ALTURA, CENTRO, LARGURA, NIVEIS, contorno } from "@/lib/contornoCorpo";
import { ICON } from "@/lib/icones";

// Captura da foto para a avaliação postural. A pessoa está sozinha: apoia o celular, aperta o
// disparo com contagem de 10 s e se posiciona dentro do contorno. A prévia da câmera frontal é
// espelhada só na tela; o quadro capturado fica como a câmera vê (o detector distingue esquerda
// e direita pelo corpo, e espelhar trocaria os lados). Alternativa: escolher uma foto já tirada.
//
// O quadro é 9:16 e o vídeo preenche com `object-cover`, então a foto é recortada na mesma
// região que aparece na tela: o contorno e a imagem final coincidem.

export interface FotoCapturada {
  src: string; // object URL (quem recebe revoga)
  largura: number;
  altura: number;
}

const CONTAGEM_S = 10;
const PROPORCAO_QUADRO = LARGURA / ALTURA; // 9:16

// Região do vídeo que `object-cover` mostra num quadro 9:16.
export function recorteCover(vw: number, vh: number): { sx: number; sy: number; sw: number; sh: number } {
  if (vw / vh > PROPORCAO_QUADRO) {
    const sw = vh * PROPORCAO_QUADRO;
    return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh };
  }
  const sh = vw / PROPORCAO_QUADRO;
  return { sx: 0, sy: (vh - sh) / 2, sw: vw, sh };
}

// Zoom digital: reduz o recorte em torno do centro, igual ao que o `scale` mostra na tela.
export function recorteComZoom(r: { sx: number; sy: number; sw: number; sh: number }, zoom: number) {
  const sw = r.sw / zoom;
  const sh = r.sh / zoom;
  return { sx: r.sx + (r.sw - sw) / 2, sy: r.sy + (r.sh - sh) / 2, sw, sh };
}

// Faixa de zoom: a do hardware, quando a câmera expõe (aceita < 1× em lentes ultra-wide);
// senão só digital, de 1× a 4× (não dá para afastar sem lente).
interface FaixaZoom {
  min: number;
  max: number;
  step: number;
  nativo: boolean;
}
const FAIXA_DIGITAL: FaixaZoom = { min: 1, max: 4, step: 0.1, nativo: false };

export function GuiaCorpo({ vista, virado, rotulos = true }: { vista: "perfil" | "frontal"; virado: boolean; rotulos?: boolean }) {
  const d = contorno(vista);
  const espelho = vista === "perfil" && virado ? `translate(${LARGURA} 0) scale(-1 1)` : undefined;
  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <mask id="recorte-corpo">
          <rect width={LARGURA} height={ALTURA} fill="white" />
          <path d={d} fill="black" transform={espelho} />
        </mask>
      </defs>
      {/* Escurece o que fica fora do contorno: o olho vai para dentro dele. */}
      <rect width={LARGURA} height={ALTURA} fill="black" fillOpacity={0.5} mask="url(#recorte-corpo)" />
      <path d={d} transform={espelho} fill="none" stroke="rgb(0 0 0 / 0.55)" strokeWidth={1.6} strokeLinejoin="round" />
      <path d={d} transform={espelho} fill="none" stroke="#b6ff3b" strokeWidth={0.75} strokeLinejoin="round" strokeDasharray="2.2 1.6" />
      {/* Prumo central: no perfil, orelha, ombro, quadril e joelho ficam sobre ele. */}
      <line x1={CENTRO} y1={3} x2={CENTRO} y2={ALTURA - 3} stroke="white" strokeOpacity={0.55} strokeWidth={0.3} strokeDasharray="1 1.6" />
      {NIVEIS[vista].map((n) => (
        <g key={n.rotulo}>
          <line x1={2} y1={n.y} x2={LARGURA - 2} y2={n.y} stroke="white" strokeOpacity={0.3} strokeWidth={0.25} strokeDasharray="0.8 1.6" />
          {rotulos && (
            <text x={2.5} y={n.y - 0.9} fontSize={2.7} fontWeight={700} fill="white" stroke="rgb(0 0 0 / 0.7)" strokeWidth={0.5} paintOrder="stroke">
              {n.rotulo}
            </text>
          )}
        </g>
      ))}
      {/* Chão e topo: o corpo inteiro precisa caber entre as duas marcas. */}
      <line x1={14} y1={155.5} x2={LARGURA - 14} y2={155.5} stroke="#b6ff3b" strokeOpacity={0.8} strokeWidth={0.5} />
      {rotulos && (
        <>
          <text x={CENTRO} y={158.8} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="#b6ff3b" stroke="rgb(0 0 0 / 0.7)" strokeWidth={0.5} paintOrder="stroke">
            pés aqui
          </text>
          <text x={CENTRO} y={5.6} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="#b6ff3b" stroke="rgb(0 0 0 / 0.7)" strokeWidth={0.5} paintOrder="stroke">
            cabeça aqui
          </text>
        </>
      )}
    </svg>
  );
}

export function CameraPostura({ silhueta, aoCapturar }: { silhueta: "perfil" | "frontal"; aoCapturar: (foto: FotoCapturada) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [erro, setErro] = useState<string | null>(null);
  const [contagem, setContagem] = useState<number | null>(null);
  const [guia, setGuia] = useState(true);
  const [virado, setVirado] = useState(false);
  const [faixa, setFaixa] = useState<FaixaZoom>(FAIXA_DIGITAL);
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const zoomDigitalRef = useRef(1);

  // Hardware: aplica na câmera. Digital: só guarda; a prévia e o recorte usam o valor.
  function aplicarZoom(z: number) {
    const v = Math.min(faixa.max, Math.max(faixa.min, Math.round(z / faixa.step) * faixa.step));
    setZoom(v);
    if (faixa.nativo) {
      trackRef.current?.applyConstraints({ advanced: [{ zoom: v } as MediaTrackConstraintSet] }).catch(() => undefined);
    } else {
      zoomDigitalRef.current = v;
    }
  }

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
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } }) | undefined;
        zoomDigitalRef.current = 1;
        if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
          const atual = (track.getSettings() as { zoom?: number }).zoom ?? caps.zoom.min;
          setFaixa({ min: caps.zoom.min, max: caps.zoom.max, step: Math.max(caps.zoom.step ?? 0.1, 0.01), nativo: true });
          setZoom(atual);
        } else {
          setFaixa(FAIXA_DIGITAL);
          setZoom(1);
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
    const { sx, sy, sw, sh } = recorteComZoom(recorteCover(v.videoWidth, v.videoHeight), zoomDigitalRef.current);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    canvas.getContext("2d")!.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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

  const botaoCanto = "toque flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white";

  return (
    <div className="space-y-3">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-base-950">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          style={{ transform: `${facing === "user" ? "scaleX(-1) " : ""}scale(${faixa.nativo ? 1 : zoom})` }}
        />
        {guia && <GuiaCorpo vista={silhueta} virado={virado} />}
        {contagem !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="font-display text-8xl font-extrabold text-white drop-shadow-lg tabular-nums">{contagem}</span>
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className={botaoCanto} aria-label="Trocar câmera">
            <SwitchCamera size={ICON.md} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setGuia((g) => !g)}
            aria-pressed={guia}
            className={cn(botaoCanto, !guia && "text-white/60")}
            aria-label={guia ? "Ocultar contorno" : "Mostrar contorno"}
          >
            {guia ? <PersonStanding size={ICON.md} aria-hidden="true" /> : <EyeOff size={ICON.md} aria-hidden="true" />}
          </button>
          {silhueta === "perfil" && guia && (
            <button type="button" onClick={() => setVirado((v) => !v)} className={botaoCanto} aria-label="Virar contorno para o outro lado">
              <ArrowLeftRight size={ICON.md} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => aplicarZoom(zoom - faixa.step * 2)} disabled={zoom <= faixa.min} className="toque flex h-10 w-10 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted disabled:opacity-40" aria-label="Afastar (zoom menor)">
          <ZoomOut size={ICON.md} aria-hidden="true" />
        </button>
        <input
          type="range"
          min={faixa.min}
          max={faixa.max}
          step={faixa.step}
          value={zoom}
          onChange={(e) => aplicarZoom(Number(e.target.value))}
          className="h-10 flex-1 accent-brand"
          aria-label="Zoom da câmera"
        />
        <button type="button" onClick={() => aplicarZoom(zoom + faixa.step * 2)} disabled={zoom >= faixa.max} className="toque flex h-10 w-10 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted disabled:opacity-40" aria-label="Aproximar (zoom maior)">
          <ZoomIn size={ICON.md} aria-hidden="true" />
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-ink-muted">{zoom.toFixed(1)}×</span>
      </div>
      {!faixa.nativo && <p className="text-center text-[11px] text-ink-faint">Esta câmera só aproxima. Para afastar, dê um passo para trás ou use a lente grande-angular (trocar câmera).</p>}
      <p className="text-center text-[11px] text-ink-faint">
        {silhueta === "perfil"
          ? "Encaixe o corpo no contorno, com a orelha, o ombro e o quadril sobre o prumo. Vire o contorno para o lado em que você está olhando."
          : "Encaixe o corpo no contorno: ombros e quadril nas linhas, pés sobre a marca do chão."}
      </p>
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
