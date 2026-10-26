"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCelebrado, getSessaoEscolhida, getTrocas, setCelebrado, setSessaoEscolhida, setTroca } from "@/lib/isabela/storage";
import type { SessaoTreino } from "@/lib/isabela/tipos";
import { getStatusPrograma, proximaDaFila, seriesDoDia, sessaoSugerida as calcularSessaoSugerida, toISODate, SERIES_NA_RETOMADA } from "@/lib/isabela/program";
import { getSessaoCompleta, SESSAO_LABEL, SESSAO_NOME, SESSOES } from "@/lib/isabela/exercicios";
import { ExercicioCard } from "@/components/isabela/ExercicioCard";
import { TreinoTimer } from "@/components/isabela/TreinoTimer";
import { PainelGamificacao } from "@/components/isabela/PainelGamificacao";
import { CelebracaoModal, type DadosCelebracao } from "@/components/isabela/CelebracaoModal";
import { useGamificacao } from "@/hooks/isabela/useGamificacao";
import { CalendarClock, CheckCircle2, Sprout } from "lucide-react";
import { ICON } from "@/lib/isabela/icones";

// Rótulo curto do seletor: B e D são ambos "Superior", então o número os distingue.
const SESSAO_CURTO: Record<SessaoTreino, string> = { A: "Quadríceps", B: "Superior 1", C: "Glúteo", D: "Superior 2" };

const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function HojePage() {
  const [pronto, setPronto] = useState(false);
  const [hoje] = useState(() => new Date());
  const [trocas, setTrocas] = useState<Record<string, string>>({});
  const [escolhida, setEscolhida] = useState<SessaoTreino | null>(null);
  const [exercicioAbertoKey, setExercicioAbertoKey] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<Record<string, { feitas: number; total: number }>>({});
  const [celebracao, setCelebracao] = useState<DadosCelebracao | null>(null);
  const [sessaoParaCelebrar, setSessaoParaCelebrar] = useState(false);
  // Sobe quando algo muda fora das séries (timer do treino) e a gamificação precisa reler.
  const [versao, setVersao] = useState(0);
  const concluidoAntes = useRef(false);

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    setTrocas(getTrocas());
    setEscolhida(getSessaoEscolhida(hojeISO));
    setPronto(true);
  }, [hojeISO]);

  const sugerida = pronto ? calcularSessaoSugerida(hojeISO) : "A";
  const sessao = escolhida ?? sugerida;
  const status = pronto ? getStatusPrograma(hojeISO, sessao) : null;
  const retomada = status?.retomada ?? false;
  const exercicios = useMemo(() => getSessaoCompleta(sessao, trocas), [sessao, trocas]);

  // Fluxo guiado: só um exercício aberto por vez; ao completar as séries do aberto, avança
  // sozinho para o próximo pendente.
  useEffect(() => {
    setExercicioAbertoKey((atual) => {
      if (atual) {
        const aindaNaLista = exercicios.some((e) => e.slotKey === atual);
        const p = progresso[atual];
        if (aindaNaLista && (!p || p.feitas < p.total)) return atual;
      }
      const proximo = exercicios.find((e) => {
        const p = progresso[e.slotKey];
        return !p || p.feitas < p.total;
      });
      return proximo ? proximo.slotKey : null;
    });
  }, [sessao, exercicios, progresso]);

  const handleProgresso = useCallback((slotKey: string, feitas: number, total: number) => {
    setProgresso((prev) => {
      const atual = prev[slotKey];
      if (atual && atual.feitas === feitas && atual.total === total) return prev;
      return { ...prev, [slotKey]: { feitas, total } };
    });
  }, []);

  // Escolher o treino do dia não trava na fila: tocar no sugerido volta ao automático.
  function escolherSessao(nova: SessaoTreino) {
    const valor = nova === sugerida ? null : nova;
    setSessaoEscolhida(hojeISO, valor);
    setEscolhida(valor);
  }

  function trocar(slotKey: string, exercicioId: string) {
    const padrao = exercicios.find((e) => e.slotKey === slotKey)?.opcoes[0].id;
    setTroca(slotKey, exercicioId === padrao ? null : exercicioId);
    setTrocas(getTrocas());
    setProgresso((prev) => {
      const { [slotKey]: _removido, ...resto } = prev;
      return resto;
    });
  }

  const progressoSessao = exercicios.reduce(
    (acc, ex) => {
      const p = progresso[ex.slotKey];
      const total = p?.total ?? seriesDoDia(ex.series, retomada);
      const feitas = p ? Math.min(p.feitas, total) : 0;
      return { feitas: acc.feitas + feitas, total: acc.total + total };
    },
    { feitas: 0, total: 0 },
  );
  const progressoPct = progressoSessao.total > 0 ? Math.min(100, (progressoSessao.feitas / progressoSessao.total) * 100) : 0;
  const treinoConcluido = progressoSessao.total > 0 && progressoSessao.feitas >= progressoSessao.total;

  const { g } = useGamificacao(hojeISO, `${progressoSessao.feitas}:${versao}`);

  // Treino concluído (todas as séries feitas) → comemora uma vez. Quem já comemorou este treino
  // não vê de novo ao reabrir o app.
  useEffect(() => {
    if (treinoConcluido && !concluidoAntes.current) setSessaoParaCelebrar(true);
    concluidoAntes.current = treinoConcluido;
  }, [treinoConcluido]);

  const chaveSessao = `${hojeISO}:${sessao}`;
  // Treino no meio (séries feitas, ainda não concluído): segura as comemorações para não
  // interromper entre uma série e outra. Elas aparecem ao concluir.
  const emTreino = progressoSessao.feitas > 0 && !sessaoParaCelebrar;
  useEffect(() => {
    if (!g || celebracao || emTreino) return;
    const visto = getCelebrado();
    const conquistasNovas = g.conquistas.filter((c) => c.desbloqueada && !visto.conquistas.includes(c.id));
    const novoNivel = g.nivel.nivel > visto.nivel;
    const sessaoConcluida = sessaoParaCelebrar && !visto.treinos.includes(chaveSessao);
    if (conquistasNovas.length > 0 || novoNivel || sessaoConcluida) setCelebracao({ sessaoConcluida, conquistasNovas, novoNivel });
  }, [g, sessaoParaCelebrar, chaveSessao, celebracao, emTreino]);

  function fecharCelebracao() {
    if (g) {
      const visto = getCelebrado();
      setCelebrado({
        conquistas: g.conquistas.filter((c) => c.desbloqueada).map((c) => c.id),
        nivel: Math.max(visto.nivel, g.nivel.nivel),
        treinos: celebracao?.sessaoConcluida ? [...visto.treinos, chaveSessao].slice(-60) : visto.treinos,
      });
    }
    setSessaoParaCelebrar(false);
    setCelebracao(null);
  }

  // Treino terminado no timer (mesmo sem todas as séries) também vale comemoração.
  function aoMudarTimer(terminou: boolean) {
    if (terminou) setSessaoParaCelebrar(true);
    setVersao((v) => v + 1);
  }

  if (!pronto) {
    return (
      <div className="p-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando o treino de hoje...</span>
        <div className="mb-4 animate-pulse space-y-2">
          <div className="h-3 w-20 rounded bg-base-600" />
          <div className="h-6 w-48 rounded bg-base-600" />
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-24 rounded-xl bg-base-600" />
          <div className="h-16 rounded-xl bg-base-600" />
          <div className="h-16 rounded-xl bg-base-600" />
        </div>
      </div>
    );
  }

  const proxima = proximaDaFila(sessao);

  return (
    <div className="p-4">
      <header className="mb-4">
        <p className="text-sm font-medium text-ink-muted">{DIAS_SEMANA_LABEL[hoje.getDay()]}</p>
        <h1 className="text-3xl font-extrabold uppercase leading-none text-ink">
          Treino {sessao} · {SESSAO_NOME[sessao]}
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          {exercicios.length} exercícios · {progressoSessao.total} séries
        </p>
      </header>

      <nav aria-label="Escolher o treino de hoje" className="mb-3">
        <div className="grid grid-cols-4 gap-2">
          {SESSOES.map((s) => {
            const ativo = s === sessao;
            return (
              <button
                key={s}
                type="button"
                onClick={() => escolherSessao(s)}
                aria-pressed={ativo}
                className={`min-h-[52px] rounded-xl border px-2 py-2 text-center active:scale-[0.97] transition-colors ${ativo ? "border-accent bg-accent-soft text-ink" : "border-line bg-base-800 text-ink-muted"}`}
              >
                <span className="block text-base font-extrabold leading-none">{s}</span>
                <span className="mt-1 block text-[10px] leading-tight">{s === sugerida ? "sugerido" : SESSAO_CURTO[s]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-line bg-base-800/95 px-4 py-2 shadow-panel backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            {treinoConcluido ? (
              <>
                <CheckCircle2 size={ICON.md} className="anim-confirmar text-accent" />
                <span>Treino concluído!</span>
              </>
            ) : (
              <span>Séries de hoje</span>
            )}
          </span>
          <span className="font-medium tabular-nums text-ink-muted">
            {progressoSessao.feitas} de {progressoSessao.total} ({Math.round(progressoPct)}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-600">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${progressoPct}%` }} />
        </div>
      </div>

      {g && <PainelGamificacao g={g} />}

      {retomada && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5">
          <Sprout aria-hidden="true" size={ICON.sm} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-xs font-medium text-ink">
            Volta aos treinos: nos primeiros {status ? Math.max(0, 4 - status.totalConcluidas) : 4} treinos são só {SERIES_NA_RETOMADA} séries por exercício, com carga leve. É de propósito: o corpo
            reaprende o movimento sem a dor do dia seguinte que faz desistir.
          </p>
        </div>
      )}

      <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessao} onMudou={aoMudarTimer} />

      <section className="mb-4">
        <h2 className="mb-2.5 text-base font-bold tracking-tight text-ink">{SESSAO_LABEL[sessao]}</h2>
        <div className="space-y-2">
          {exercicios.map((ex) => (
            <ExercicioCard
              key={`${ex.slotKey}:${ex.id}`}
              exercicio={ex}
              retomada={retomada}
              data={hojeISO}
              expandido={exercicioAbertoKey === ex.slotKey}
              onToggleExpandido={() => setExercicioAbertoKey((atual) => (atual === ex.slotKey ? null : ex.slotKey))}
              onProgresso={handleProgresso}
              onTrocar={trocar}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Dor na lombar (ou em qualquer lugar) durante um exercício? Pare e use &ldquo;Trocar exercício&rdquo; por outra opção. Se a dor continuar, fale com quem acompanha você.
        </p>
      </section>

      <div className="mt-2 flex gap-3 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
        <CalendarClock aria-hidden="true" size={ICON.md} className="mt-0.5 shrink-0 text-ink-muted" />
        <div>
          <p className="text-sm font-semibold text-ink">Próximo treino: {proxima}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {SESSAO_LABEL[proxima]}. Faltou um dia? Sem problema: o próximo da fila continua sendo o próximo.
          </p>
        </div>
      </div>

      {g && <CelebracaoModal g={g} dados={celebracao} onFechar={fecharCelebracao} />}
    </div>
  );
}
