"use client";

import { Sparkles } from "lucide-react";

interface AiCoachFloatingButtonProps {
  onClick: () => void;
  notificacao?: boolean;
}

export function AiCoachFloatingButton({ onClick, notificacao }: AiCoachFloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir BioFIT AI Coach"
      className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-brand-hover text-on-solid shadow-lg shadow-brand/20 transition hover:scale-105 active:scale-95 border border-brand-hover/40"
    >
      <Sparkles size={22} className="animate-pulse" />
      {notificacao && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent" />
        </span>
      )}
    </button>
  );
}
