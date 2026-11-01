import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Confianca } from "@/lib/painel/tipos";

export function Cartao({ titulo, sub, children, className }: { titulo: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border vidro p-4", className)}>
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">{titulo}</h2>
      {sub && <p className="mb-2 mt-0.5 text-xs text-ink-muted">{sub}</p>}
      <div className={sub ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

export function Metrica({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-base-900/60 p-3 text-center">
      <div className="text-[11px] text-ink-muted">{rotulo}</div>
      <div className="font-display text-xl font-bold text-ink">{valor}</div>
      {sub && <div className="text-[10px] text-ink-faint">{sub}</div>}
    </div>
  );
}

const CONF: Record<Confianca, string> = {
  baixa: "border-danger/50 text-danger",
  media: "border-brand/50 text-brand",
  alta: "border-accent/50 text-accent",
};

// A confiança sempre aparece escrita (não só em cor).
export function SeloConfianca({ nivel, n }: { nivel: Confianca; n: number }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", CONF[nivel])}>
      Confiança {nivel} · {n} dados analisados
    </span>
  );
}
