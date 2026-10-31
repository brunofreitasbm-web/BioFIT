"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useBackLayers } from "@/hooks/useBackHandler";
import { ICON } from "@/lib/icones";

export type AcaoMenu = { label: string; Icon: LucideIcon; onSelect: () => void };

// Menu "⋯" com as ações secundárias de um card. Fecha ao escolher, ao tocar fora e no voltar do celular.
export function MenuAcoes({ acoes, rotulo }: { acoes: AcaoMenu[]; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useBackLayers([{ active: aberto, back: () => setAberto(false) }]);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: PointerEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  if (acoes.length === 0) return null;

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={rotulo}
        className="toque flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:text-ink"
      >
        <MoreHorizontal aria-hidden="true" size={ICON.md} />
      </button>
      {aberto && (
        <div role="menu" className="anim-revelar absolute right-0 top-full z-20 mt-1 min-w-[13rem] overflow-hidden vidro-forte rounded-xl border py-1 shadow-nav">
          {acoes.map(({ label, Icon, onSelect }) => (
            <ItemMenu
              key={label}
              onClick={() => {
                setAberto(false);
                onSelect();
              }}
            >
              <Icon aria-hidden="true" size={ICON.sm} />
              {label}
            </ItemMenu>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemMenu({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="toque flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium text-ink hover:bg-base-600"
    >
      {children}
    </button>
  );
}
