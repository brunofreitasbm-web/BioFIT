import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { ICON } from "@/lib/isabela/icones";

// Estado vazio com âncora visual: o ícone diz "aqui ainda não tem dado" antes do texto.
export function EstadoVazio({ texto, Icone = Inbox }: { texto: string; Icone?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-base-700 text-ink-faint" aria-hidden="true">
        <Icone size={ICON.lg} />
      </span>
      <p className="max-w-[26ch] text-xs text-ink-muted">{texto}</p>
    </div>
  );
}
