"use client";

import { X } from "lucide-react";

export function VideoModal({ youtubeId, titulo, onClose }: { youtubeId: string; titulo: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="truncate pr-2 text-sm font-medium text-white">{titulo}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-base-900"
            aria-label="Fechar vídeo"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-hidden rounded-xl bg-black shadow-panel" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&end=30`}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
