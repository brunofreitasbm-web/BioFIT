"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Flame, Lock, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/isabela/cn";
import { ICON } from "@/lib/isabela/icones";
import { addDiasISO, toISODate } from "@/lib/isabela/program";
import { lerDadosLocais } from "@/lib/isabela/storage";
import {
  atividadePorDia,
  inicioDaSemana,
  META_SEMANAL,
  MULTIPLICADORES,
  SEMANAS_PARA_ESCUDO,
  XP_SERIE,
  XP_SESSAO,
  type AtividadeDoDia,
  type Gamificacao,
} from "@/lib/isabela/gamificacao";
import { useGamificacao } from "@/hooks/isabela/useGamificacao";
import { IconeConquista } from "@/components/isabela/IconeConquista";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function ConquistasPage() {
  const [hoje] = useState(() => new Date());
  const hojeISO = toISODate(hoje);
  const { g } = useGamificacao(hojeISO);

  if (!g) return <div className="p-4" aria-busy="true" />;

  const desbloqueadas = g.conquistas.filter((c) => c.desbloqueada);
  const pendentes = g.conquistas.filter((c) => !c.desbloqueada);

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-semibold text-ink">Conquistas</h1>
        <p className="text-sm text-ink-muted">A meta são {META_SEMANAL} treinos por semana. Série registrada e treino terminado dão XP.</p>
      </header>

      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-panel" aria-label="Nível">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted">Nível</p>
            <p className="font-display text-4xl font-extrabold leading-none text-ink">
              {g.nivel.nivel} <span className="text-lg font-bold uppercase text-brand">{g.nivel.titulo}</span>
            </p>
          </div>
          <p className="flex items-center gap-1 text-sm font-semibold tabular-nums text-ink">
            <Zap aria-hidden="true" size={ICON.sm} className="text-brand" /> {g.xp.total} XP
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-base-600">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${g.nivel.fracao * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {g.nivel.xpNoNivel}/{g.nivel.xpParaProximo} XP para o nível {g.nivel.nivel + 1}
        </p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Numero icone={<Flame size={ICON.md} />} valor={g.semanas.atual} rotulo="semanas seguidas" />
        <Numero icone={<Flame size={ICON.md} />} valor={g.semanas.recorde} rotulo="recorde" />
        <Numero icone={<Dumbbell size={ICON.md} />} valor={g.totalSessoes} rotulo="treinos feitos" />
      </div>

      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-panel" aria-label="Semana livre">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Shield aria-hidden="true" size={ICON.sm} className={g.semanas.escudos > 0 ? "text-brand" : "text-ink-faint"} fill={g.semanas.escudos > 0 ? "currentColor" : "none"} />
          Semana livre: {g.semanas.escudos > 0 ? "disponível" : "ainda não"}
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Cobre 1 semana abaixo de {META_SEMANAL} treinos sem zerar suas semanas seguidas. Você ganha uma a cada {SEMANAS_PARA_ESCUDO} semanas seguidas na meta.
        </p>
      </section>

      <Calendario g={g} hoje={hoje} />

      <section aria-label="Conquistas desbloqueadas">
        <h2 className="mb-2 text-sm font-semibold text-ink">
          Desbloqueadas <span className="text-ink-muted">({desbloqueadas.length}/{g.conquistas.length})</span>
        </h2>
        {desbloqueadas.length === 0 ? (
          <p className="rounded-xl border border-line bg-base-800 p-3 text-xs text-ink-muted">Termine seu primeiro treino para abrir a primeira conquista.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {desbloqueadas.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-solid">
                  <IconeConquista icone={c.icone} size={ICON.md} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{c.nome}</span>
                  <span className="block text-xs leading-tight text-ink-muted">{c.descricao}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendentes.length > 0 && (
        <section aria-label="Conquistas a desbloquear">
          <h2 className="mb-2 text-sm font-semibold text-ink">Para desbloquear</h2>
          <ul className="space-y-2">
            {pendentes.map((c) => (
              <li key={c.id} className="rounded-xl border border-line bg-base-800 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-700 text-ink-faint">
                    <Lock aria-hidden="true" size={ICON.sm} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink">{c.nome}</span>
                    <span className="block text-xs text-ink-muted">{c.descricao}</span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-ink-muted">
                    {c.atual}/{c.alvo}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-base-600">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.atual / c.alvo) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-base-800 p-4 text-xs text-ink-muted" aria-label="Como funciona">
        <h2 className="mb-2 text-sm font-semibold text-ink">Como funciona</h2>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            <strong className="text-ink">Meta:</strong> {META_SEMANAL} treinos de segunda a domingo, nos dias que quiser. Fechou a semana, soma uma semana seguida.
          </li>
          <li>
            <strong className="text-ink">XP:</strong> {XP_SERIE} por série registrada e {XP_SESSAO} por treino. Não depende de quanta carga você usa.
          </li>
          <li>
            <strong className="text-ink">Bônus:</strong>{" "}
            {[...MULTIPLICADORES].reverse().map((m) => `${m.aPartirDe}+ semanas seguidas = XP ×${m.fator}`).join(" · ")}.
          </li>
          <li>
            <strong className="text-ink">Primeira semana:</strong> não conta contra você. Se começar na quinta, tudo bem.
          </li>
          <li>
            <strong className="text-ink">Parou uns dias?</strong> Nada é perdido: XP e conquistas ficam. Voltar depois de 7+ dias parada desbloqueia &ldquo;Volta por cima&rdquo;.
          </li>
          <li>
            <strong className="text-ink">Mais forte:</strong> usar mais carga que da última vez num exercício conta uma &ldquo;carga nova&rdquo;.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Numero({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number | string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-line bg-base-800 p-3 text-center shadow-panel">
      <span aria-hidden="true" className="mx-auto mb-1 flex justify-center text-brand">
        {icone}
      </span>
      <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{valor}</p>
      <p className="text-xs font-medium text-ink-muted">{rotulo}</p>
    </div>
  );
}

function Calendario({ g, hoje }: { g: Gamificacao; hoje: Date }) {
  const [offset, setOffset] = useState(0); // meses antes do atual
  const hojeISO = toISODate(hoje);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const atividade = useMemo(() => atividadePorDia(lerDadosLocais()), [g]);

  const ref = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
  const primeiro = toISODate(ref);
  const inicioGrade = inicioDaSemana(primeiro);
  const diasNoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const semanas = Math.ceil((((new Date(primeiro + "T00:00:00").getDay() + 6) % 7) + diasNoMes) / 7);

  return (
    <section className="rounded-xl border border-line bg-base-800 p-4 shadow-panel" aria-label="Calendário">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Mês anterior" className="toque flex h-11 w-11 items-center justify-center text-ink-muted">
          <ChevronLeft aria-hidden="true" size={ICON.md} />
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {MESES[ref.getMonth()]} {ref.getFullYear()}
        </h2>
        <button type="button" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Próximo mês" className="toque flex h-11 w-11 items-center justify-center text-ink-muted disabled:opacity-30">
          <ChevronRight aria-hidden="true" size={ICON.md} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-faint">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: semanas * 7 }, (_, i) => {
          const data = addDiasISO(inicioGrade, i);
          const doMes = data.slice(0, 7) === primeiro.slice(0, 7);
          return <Celula key={data} data={data} doMes={doMes} hojeISO={hojeISO} a={atividade.get(data)} protegido={g.semanas.semanasProtegidas.includes(inicioDaSemana(data)) && data < hojeISO} />;
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
        <Legenda cor="bg-accent" texto="treinou" />
        <Legenda cor="bg-brand-soft border border-brand/50" texto="semana livre" />
      </p>
    </section>
  );
}

function Celula({ data, doMes, hojeISO, a, protegido }: { data: string; doMes: boolean; hojeISO: string; a: AtividadeDoDia | undefined; protegido: boolean }) {
  const forca = !!a && (a.series > 0 || a.sessoes > 0);
  return (
    <span
      className={cn(
        "flex aspect-square items-center justify-center rounded-md text-xs tabular-nums",
        !doMes && "invisible",
        forca && "bg-accent font-bold text-on-solid",
        protegido && "border border-brand/50 bg-brand-soft font-semibold text-brand",
        !forca && !protegido && "bg-base-700 text-ink-faint",
        data === hojeISO && "ring-2 ring-brand",
      )}
    >
      {Number(data.slice(8))}
    </span>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-sm", cor)} />
      {texto}
    </span>
  );
}
