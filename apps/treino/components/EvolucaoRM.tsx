import Link from "next/link";
import { cn } from "@/lib/cn";
import type { EvolucaoRecente } from "@/lib/relatorio";

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// 1RM estimado da última sessão contra a anterior, dos exercícios feitos mais recentemente.
export function EvolucaoRM({ itens }: { itens: EvolucaoRecente[] }) {
  return (
    <ul className="divide-y divide-line text-sm">
      {itens.map((e) => {
        const pct = Math.round(e.variacaoPct);
        const sinal = pct > 0 ? "+" : "";
        return (
          <li key={e.exercicioId}>
            <Link
              href={`/relatorio/exercicios/${e.exercicioId}`}
              className="toque flex min-h-12 items-center gap-2 py-2"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{e.nome}</span>
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                {fmt(e.anterior1RM)} → {fmt(e.atual1RM)}
              </span>
              <span
                className={cn(
                  "w-12 shrink-0 text-right text-xs font-bold tabular-nums",
                  pct > 0 ? "text-accent" : pct < 0 ? "text-danger" : "text-ink-faint",
                )}
              >
                {sinal}
                {pct}%
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
