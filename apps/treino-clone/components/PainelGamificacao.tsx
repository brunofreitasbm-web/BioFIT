import Link from "next/link";
import { ChevronRight, Flame, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import { ESCUDOS_MAX, type DiaDaSemana, type Gamificacao } from "@/lib/gamificacao";

const COR_DIA: Record<DiaDaSemana["estado"], string> = {
  forca: "border-accent bg-accent text-on-solid",
  leve: "border-accent/50 bg-accent-soft text-accent",
  protegido: "border-brand/50 bg-brand-soft text-brand",
  perdido: "border-line bg-base-700 text-ink-faint",
  futuro: "border-line bg-transparent text-ink-faint",
  hoje: "border-brand bg-transparent text-brand",
};

const TOM: Record<Gamificacao["mensagem"]["tom"], string> = {
  celebrar: "border-accent/30 bg-accent-soft",
  empurrar: "border-brand/30 bg-brand-soft",
  acolher: "border-line bg-base-700",
  neutro: "border-line bg-base-700",
};

// Cartão do topo da tela Hoje: sequência, escudos, nível, semana e o recado do dia.
export function PainelGamificacao({ g }: { g: Gamificacao }) {
  const { sequencia, semana, nivel, mensagem, proxima } = g;
  const emRisco = !sequencia.hojeFeito && sequencia.atual > 0;
  return (
    <section aria-label="Sua sequência" className="mb-4 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              sequencia.hojeFeito ? "bg-brand text-on-solid" : emRisco ? "bg-brand-soft text-brand" : "bg-base-700 text-ink-faint",
            )}
          >
            <Flame size={ICON.lg} fill={sequencia.hojeFeito ? "currentColor" : "none"} />
          </span>
          <div className="leading-none">
            <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{sequencia.atual}</p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-muted">{sequencia.atual === 1 ? "dia seguido" : "dias seguidos"}</p>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="flex items-center gap-0.5" aria-label={`${sequencia.escudos} de ${ESCUDOS_MAX} escudos`} title="Escudos: cada um cobre 1 dia sem treino">
            {Array.from({ length: ESCUDOS_MAX }, (_, i) => (
              <Shield
                key={i}
                size={ICON.sm}
                aria-hidden="true"
                className={i < sequencia.escudos ? "text-brand" : "text-ink-faint"}
                fill={i < sequencia.escudos ? "currentColor" : "none"}
              />
            ))}
          </span>
          <Link href="/conquistas" className="toque flex min-h-11 items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
            Nv {nivel.nivel} · {nivel.titulo}
            <ChevronRight aria-hidden="true" size={ICON.sm} />
          </Link>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2" aria-label={`${nivel.xpNoNivel} de ${nivel.xpParaProximo} XP para o próximo nível`}>
        <Zap aria-hidden="true" size={ICON.xs} className="shrink-0 text-brand" />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-600">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${nivel.fracao * 100}%` }} />
        </div>
        <span className="text-[11px] font-medium tabular-nums text-ink-muted">
          {nivel.xpNoNivel}/{nivel.xpParaProximo} XP
        </span>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">Semana</span>
          <span className={cn("font-medium tabular-nums", semana.batida ? "text-accent" : "text-ink-muted")}>
            {semana.diasDeForca}/{semana.meta} treinos{semana.batida ? " · meta batida" : ""}
          </span>
        </div>
        <ol className="flex justify-between gap-1" aria-label="Dias da semana">
          {semana.dias.map((d) => (
            <li key={d.data} className="flex flex-1 justify-center">
              <span
                className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold", COR_DIA[d.estado])}
                aria-label={`${d.data}: ${d.estado}`}
              >
                {d.rotulo}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={cn("rounded-lg border px-3 py-2", TOM[mensagem.tom])}>
        <p className="text-sm font-semibold text-ink">{mensagem.titulo}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{mensagem.texto}</p>
        {g.xp.multiplicadorHoje > 1 && (
          <p className="mt-1 text-[11px] font-semibold text-brand">XP ×{g.xp.multiplicadorHoje} hoje pela sequência</p>
        )}
      </div>

      {proxima && (
        <p className="mt-2 text-[11px] text-ink-muted">
          Próxima conquista: <span className="font-semibold text-ink">{proxima.nome}</span> ({proxima.atual}/{proxima.alvo})
        </p>
      )}
    </section>
  );
}
