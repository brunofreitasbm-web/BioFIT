import Link from "next/link";
import { Check, ChevronRight, Flame, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/isabela/cn";
import { ICON, STROKE } from "@/lib/isabela/icones";
import type { Gamificacao } from "@/lib/isabela/gamificacao";

const TOM = {
  celebrar: "border-accent/30 bg-accent-soft",
  empurrar: "border-brand/30 bg-brand-soft",
  acolher: "border-line bg-base-700",
} as const;

// Topo da tela Hoje: a semana em 4 círculos (a meta), semanas seguidas, nível e o recado do dia.
export function PainelGamificacao({ g }: { g: Gamificacao }) {
  const { semana, semanas, nivel, mensagem, proxima } = g;
  const circulos = Math.max(semana.meta, semana.feitos);
  return (
    <section aria-label="Sua semana" className="mb-4 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink-muted">Treinos da semana</p>
          <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink">
            {semana.feitos}
            <span className="text-ink-faint">/{semana.meta}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-ink" aria-label={`${semanas.atual} semanas seguidas na meta`}>
            <Flame aria-hidden="true" size={ICON.md} className={semanas.atual > 0 ? "text-brand" : "text-ink-faint"} fill={semanas.atual > 0 ? "currentColor" : "none"} />
            {semanas.atual} {semanas.atual === 1 ? "semana seguida" : "semanas seguidas"}
          </p>
          <span className="flex items-center gap-1 text-[11px] font-medium text-ink-muted" title="Semana livre: cobre 1 semana abaixo da meta. Ganha uma a cada 4 semanas seguidas.">
            <Shield aria-hidden="true" size={ICON.xs} className={semanas.escudos > 0 ? "text-brand" : "text-ink-faint"} fill={semanas.escudos > 0 ? "currentColor" : "none"} />
            {semanas.escudos > 0 ? "Semana livre disponível" : "Semana livre: a cada 4 seguidas"}
          </span>
        </div>
      </div>

      <ol className="mb-2 flex gap-2" aria-label="Treinos da semana">
        {Array.from({ length: circulos }, (_, i) => {
          const feito = i < semana.feitos;
          return (
            <li key={i} className="flex-1">
              <span
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border-2 text-sm font-bold",
                  feito ? "anim-confirmar border-accent bg-accent text-on-solid" : "border-dashed border-line text-ink-faint",
                )}
                aria-label={feito ? `Treino ${i + 1} feito` : `Treino ${i + 1} pendente`}
              >
                {feito ? <Check aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} /> : i + 1}
              </span>
            </li>
          );
        })}
      </ol>
      <ol className="mb-3 flex justify-between px-1" aria-label="Dias da semana">
        {semana.dias.map((d) => (
          <li
            key={d.data}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
              d.estado === "treinou" && "bg-accent text-on-solid",
              d.estado === "hoje" && "border border-brand text-brand",
              d.estado === "futuro" && "text-ink-faint",
              d.estado === "passado" && "text-ink-faint/60",
            )}
            aria-label={`${d.data}: ${d.estado}`}
          >
            {d.rotulo}
          </li>
        ))}
      </ol>

      <div className={cn("rounded-lg border px-3 py-2", TOM[mensagem.tom])}>
        <p className="text-sm font-semibold text-ink">{mensagem.titulo}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{mensagem.texto}</p>
        {g.xp.multiplicadorHoje > 1 && <p className="mt-1 text-[11px] font-semibold text-brand">XP ×{g.xp.multiplicadorHoje} nesta semana</p>}
      </div>

      <div className="mt-3 flex items-center gap-2" aria-label={`${nivel.xpNoNivel} de ${nivel.xpParaProximo} XP para o próximo nível`}>
        <Zap aria-hidden="true" size={ICON.xs} className="shrink-0 text-brand" />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-600">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${nivel.fracao * 100}%` }} />
        </div>
        <Link href="/isabela/conquistas" className="toque flex min-h-11 items-center gap-0.5 text-[11px] font-semibold tabular-nums text-ink-muted hover:text-ink">
          Nv {nivel.nivel} · {nivel.titulo} · {nivel.xpNoNivel}/{nivel.xpParaProximo} XP
          <ChevronRight aria-hidden="true" size={ICON.sm} />
        </Link>
      </div>
      {proxima && (
        <p className="text-[11px] text-ink-muted">
          Próxima conquista: <span className="font-semibold text-ink">{proxima.nome}</span> ({proxima.atual}/{proxima.alvo})
        </p>
      )}
    </section>
  );
}
