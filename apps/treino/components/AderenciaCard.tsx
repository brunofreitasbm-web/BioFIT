import { cn } from "@/lib/cn";
import { ADERENCIA_META, ADERENCIA_MINIMO, type StatusAderencia } from "@/lib/program";

function dataBR(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const TEXTO_DECISAO: Record<StatusAderencia["decisao"], string> = {
  EM_ANDAMENTO: "Em andamento",
  MANTER_5X: "Mantém o programa 5x",
  CAIR_UPPER_LOWER: "Cai para Upper/Lower 4x — sem renegociação",
};

// Aba "Aderência" da planilha: meta de 10 sessões nos primeiros 14 dias; menos de 8 →
// o programa cai para Upper/Lower 4x.
export function AderenciaCard({ aderencia }: { aderencia: StatusAderencia }) {
  const pct = Math.min(100, (aderencia.realizadas / ADERENCIA_META) * 100);
  const encerrada = aderencia.decisao !== "EM_ANDAMENTO";
  return (
    <div
      className={cn(
        "mb-3 rounded-xl border p-3",
        aderencia.decisao === "CAIR_UPPER_LOWER" ? "border-danger/30 bg-danger-soft" : "border-line bg-base-800 shadow-panel",
      )}
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">
          Aderência {dataBR(aderencia.inicio)}–{dataBR(aderencia.fim)}
        </span>
        <span className="text-ink-muted">
          {aderencia.realizadas}/{ADERENCIA_META} sessões
          {!encerrada && ` · ${aderencia.diasRestantes} dia(s) restante(s)`}
        </span>
      </div>
      <div className="relative mb-1.5 h-2 w-full overflow-hidden rounded-full bg-base-600">
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-danger"
          style={{ left: `${(ADERENCIA_MINIMO / ADERENCIA_META) * 100}%` }}
        />
      </div>
      <p className={cn("text-[11px]", aderencia.decisao === "CAIR_UPPER_LOWER" ? "font-medium text-danger" : "text-ink-muted")}>
        {TEXTO_DECISAO[aderencia.decisao]} · mínimo para manter 5x: {ADERENCIA_MINIMO}
      </p>
    </div>
  );
}
