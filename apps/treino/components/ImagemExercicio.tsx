"use client";

import { X } from "lucide-react";
import { ICON } from "@/lib/icones";

// Fotos de início e fim do movimento (free-exercise-db, Unlicense — ver NOTICE.md), sobrepostas
// e alternando em loop: um "GIF" de duas poses sem precisar de GIF. São só referência do
// padrão de movimento; a máquina exata da academia pode ser outra. Abre sob demanda (botão do
// card), como o vídeo, para não empurrar os campos de registro para baixo.
export function ImagemExercicio({ pasta, titulo, onClose }: { pasta: string; titulo: string; onClose: () => void }) {
  const src = (i: number) => `/exercicios/${pasta}/${i}.jpg`;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="truncate pr-2 text-sm font-medium text-white">{titulo}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-base-950"
            aria-label="Fechar foto"
          >
            <X aria-hidden="true" size={ICON.sm} />
          </button>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-panel">
          {/* eslint-disable-next-line @next/next/no-img-element -- estático em public/, sem otimização do Next */}
          <img src={src(0)} alt={`${titulo}: posição inicial`} className="absolute inset-0 h-full w-full object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(1)} alt="" aria-hidden="true" className="anim-alternar-foto absolute inset-0 h-full w-full object-contain" />
        </div>
        <p className="mt-2 text-center text-[11px] text-white/70">Referência do movimento; a sua máquina pode ser diferente.</p>
      </div>
    </div>
  );
}
