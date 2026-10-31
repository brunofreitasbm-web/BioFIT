import type { ExercicioEfetivo, SerieRegistrada, SessaoTreino } from "../tipos";
import type { StatusPrograma } from "../program";

export interface BioimpedanciaContexto {
  data: string;
  pesoKg?: number | null;
  gorduraPct?: number | null;
  massaMagraKg?: number | null;
  massaMuscularEsqueleticaKg?: number | null;
  massaGorduraKg?: number | null;
  indiceApendicular?: number | null;
  historico?: {
    data: string;
    hora?: string;
    pesoKg: number | null;
    gorduraPct: number | null;
    massaGorduraKg?: number | null;
    massaMagraKg: number | null;
    gorduraVisceral?: number | null;
    // Motivo pelo qual esta medição parece artefato (hidratação, horário) em vez de mudança real.
    suspeita?: string | null;
  }[];
  // Leitura de tendência calculada pelo app (lib/corpo.ts). O modelo deve citar, não recalcular.
  analise?: {
    veredito: string;
    leituraProvisoria: string | null;
    confianca: "alta" | "media" | "baixa";
    leituras: number;
    periodo: { inicio: string; fim: string } | null;
    explicacao: string;
    avisos: string[];
    porMes: Record<string, number>;
    forcaVariacaoPct: number | null;
  } | null;
  segmentos?: { nome: string; massaMagraKg: number | null; variacaoMassaMagraKg: number | null }[] | null;
  gorduraVisceral?: number | null;
  aguaCorporalPct?: number | null;
  tmbKcal?: number | null;
  idadeMetabolica?: number | null;
  anterior?: {
    data: string;
    diasEntre: number | null;
    pesoKg?: number | null;
    gorduraPct?: number | null;
    massaMagraKg?: number | null;
    massaMuscularEsqueleticaKg?: number | null;
    gorduraVisceral?: number | null;
  } | null;
}

// ===== Dados integrados (bioimpedância × treino × Garmin) =====

export interface GarminDia {
  data: string;
  sonoHoras: number | null;
  sonoScore: number | null;
  hrvMs: number | null;
  fcRepouso: number | null;
  passos: number | null;
  estresse: number | null;
  bodyBattery: number | null;
}

export interface GarminTreino {
  data: string;
  tipo: string;
  duracaoMin: number | null;
  fcMedia: number | null;
  calorias: number | null;
}

// Leitura de recuperação já calculada pelo servidor (lib/recuperacao). O modelo usa estes
// números em vez de inventar um julgamento de prontidão a partir de médias soltas.
export interface GarminRecuperacao {
  data: string;
  prontidaoBiofit: number | null;
  recomendacao: string | null;
  prontidaoGarmin: number | null;
  acwr: number | null;
  sonoProfundoMin: number | null;
  sonoRemMin: number | null;
  alertas: string[]; // insights de atenção (ex.: sinais precoces de doença)
}

export interface GarminJanela {
  diario: GarminDia[]; // mais antigo primeiro
  treinos: GarminTreino[];
  recuperacao?: GarminRecuperacao | null;
}

export interface TreinoRecenteContexto {
  janelaDias: number;
  treinosPorSemana: number;
  seriesPorSemana: { grupo: string; series: number }[]; // maiores primeiro
  forcaVariacaoPct: number | null; // média da variação de 1RM nos exercícios com 2+ sessões
  evolucao: { nome: string; anterior1RM: number; atual1RM: number; variacaoPct: number }[];
}

// Um intervalo entre duas medições consecutivas: o que mudou no corpo e o que aconteceu no meio.
export interface CruzamentoIntervalo {
  de: string;
  ate: string;
  dias: number;
  delta: { pesoKg: number | null; gorduraPp: number | null; massaMagraKg: number | null };
  treino: { treinosPorSemana: number; seriesPorSemana: number };
  garmin: {
    diasComDados: number;
    sonoHoras: number | null;
    fcRepouso: number | null;
    hrvMs: number | null;
    passos: number | null;
  } | null; // null = sem dados do Garmin no intervalo
}

export interface ContextoTreinoIA {
  sessao?: SessaoTreino | null;
  sessaoNome?: string;
  exercicioAtual?: {
    id: string;
    nome: string;
    grupoMuscular: string;
    seriesPrescritas: number;
    repsPrescritas: string;
    descanso: string;
    partida: string;
    composto: boolean;
    notas?: string;
  } | null;
  statusPrograma?: {
    meso: number;
    rodada: number;
    isDeload: boolean;
  } | null;
  seriesHoje?: SerieRegistrada[];
  historicoUltimaSessao?: SerieRegistrada[];
  historicoAnterior?: SerieRegistrada[];
  recorde1RM?: number | null;
  biometriaGarmin?: {
    bodyBattery?: number;
    sonoHoras?: number;
    stress?: number;
    hrvStatus?: string;
  } | null;
  streakDias?: number;
  bioimpedancia?: BioimpedanciaContexto | null;
  garminJanela?: GarminJanela | null;
  treinoRecente?: TreinoRecenteContexto | null;
  cruzamentos?: CruzamentoIntervalo[] | null;
}

export const BIOFIT_SYSTEM_PROMPT = `
Você é o BioFIT AI Coach, um assistente de inteligência artificial de elite especializado em musculação baseada em evidências, hipertrofia, biomecânica e auto-regulação de treino.

Seu público é o atleta que está utilizando o BioFIT — muitas vezes consultando você no meio da sessão de treino na academia pelo celular.

### Princípios Fundamentais do BioFIT:
1. **Estrutura de Mesociclo (ULPPL)**:
   - Divisão sequencial fixa de 5 sessões: A (Upper 1), B (Lower 1 - foco Quad), C (Push), D (Pull), E (Lower 2 - foco Posterior/Glúteo).
   - Ciclos de 5 rodadas: Rodadas 1 a 4 com sobrecarga progressiva, Rodada 5 é DELOAD obrigatório (−50% de séries, −10% de carga, longe da falha).
   - Rodada 1 tem calibração com "Teste de falha" nos exercícios designados (anotação de palpite pré-série vs repetições reais até a falha técnica).

2. **Auto-regulação & RIR (Reps in Reserve)**:
   - Exercícios Compostos (posições 1–2 da sessão): Alvo de esforço de RIR 1–2 (parar com 1 a 2 repetições antes da falha técnica para preservar o SNC e manter a segurança).
   - Exercícios Isolados: Alvo de esforço de RIR 0–1 (podem ir até a falha técnica ou 1 rep antes).
   - Se todas as séries saem com o mesmo número exato de repetições e a mesma carga facilmente, o atleta não está treinando com a intensidade adequada (RIR real muito alto).

3. **Sobrecarga Progressiva Realista**:
   - Critério de progressão dupla: Primeiro atinge o topo da faixa de repetições prescrita em todas as séries com boa forma; depois aumenta a carga (+1kg a 2kg em superiores/isolados, +2kg a 5kg em inferiores/compostos).
   - Não aumentar carga se o RIR da última série foi 0 com quebra de postura técnica.

4. **Composição Corporal (Bioimpedância)**:
   - Quando houver medições, cruze com treino e recuperação: massa magra/muscular subindo com gordura estável ou caindo indica recomposição; peso subindo sem ganho de massa magra sugere superávit excessivo.
   - Bioimpedância varia com hidratação, alimentação e horário: variações pequenas (<0,5 kg ou <0,5 p.p. de gordura) entre medições próximas estão dentro do ruído — não superinterprete.
   - Use os dados para orientar volume, progressão e deload, mas NÃO faça diagnóstico médico nem prescreva dieta/calorias exatas; sugira procurar nutricionista/médico quando pertinente.
   - Se o dado necessário não foi informado, diga que não tem a informação em vez de inventar.
   - O contexto traz uma "Leitura de tendência calculada pelo app" com veredito e confiança. Cite essa leitura; não refaça a conta nem contradiga o veredito. Se o veredito for "inconclusivo", "dados_insuficientes" ou a confiança for baixa, diga isso antes de qualquer recomendação e peça nova medição (mesmo horário, de manhã e em jejum).
   - Medições marcadas com "possível artefato" não devem sustentar conclusões; mencione-as como ruído.
   - Use o "Cruzamento por intervalo" para ligar causa e efeito: compare o que mudou no corpo com séries/semana, sono, FC de repouso, HRV e passos do mesmo período. Cite os números do intervalo. Onde o Garmin não tem dados, diga que não dá para avaliar recuperação naquele período.
   - Correlação de poucos pontos não é causa: com 4 ou menos intervalos, apresente como hipótese, nunca como fato.

5. **Diretrizes de Comunicação**:
   - **Conciso e direto ao ponto**: Responda com clareza imediata. O usuário está no intervalo do exercício ou montando a barra.
   - **Formatação limpa**: Use tópicos curtos, negrito para números e cargas sugeridas.
   - **Segurança primeiro**: Se o atleta relatar dor articular (tendão, ombro, lombar), priorize orientações biomecânicas ou sugira substituições equivalentes seguras.
   - **Tom**: Profissional, científico, encorajador e prático. Em português do Brasil.
`.trim();

const ROTULO_METRICA: Record<string, string> = {
  pesoKg: "peso (kg)",
  gorduraPct: "gordura (p.p.)",
  massaGordaKg: "massa gorda (kg)",
  massaLivreKg: "massa magra (kg)",
  musculoEsqueleticoKg: "músculo esq. (kg)",
};

export function formatarContextoParaPrompt(ctx?: ContextoTreinoIA | null): string {
  if (!ctx) return "Nenhum contexto de treino ativo fornecido.";

  const partes: string[] = [];

  if (ctx.statusPrograma) {
    partes.push(
      `• Mesociclo: Meso ${ctx.statusPrograma.meso} · ${
        ctx.statusPrograma.isDeload
          ? "SEMANA DE DELOAD (rodada 5 - reduzir séries pela metade e carga em -10%)"
          : `Rodada ${ctx.statusPrograma.rodada} de 4`
      }`,
    );
  }

  if (ctx.sessao) {
    partes.push(`• Sessão do Dia: Sessão ${ctx.sessao} ${ctx.sessaoNome ? `(${ctx.sessaoNome})` : ""}`);
  }

  if (ctx.streakDias && ctx.streakDias > 0) {
    partes.push(`• Consistência: ${ctx.streakDias} dias seguidos de treino`);
  }

  if (ctx.biometriaGarmin) {
    const { bodyBattery, sonoHoras, stress, hrvStatus } = ctx.biometriaGarmin;
    const bioPartes = [];
    if (bodyBattery != null) bioPartes.push(`Body Battery: ${bodyBattery}/100`);
    if (sonoHoras != null) bioPartes.push(`Sono: ${sonoHoras.toFixed(1)}h`);
    if (stress != null) bioPartes.push(`Stress: ${stress}`);
    if (hrvStatus) bioPartes.push(`HRV: ${hrvStatus}`);
    if (bioPartes.length > 0) {
      partes.push(`• Biometria Garmin de Hoje: ${bioPartes.join(", ")}`);
    }
  }

  if (ctx.bioimpedancia) {
    const b = ctx.bioimpedancia;
    const f = (rotulo: string, v?: number | null, un = "") => (v != null ? `${rotulo}: ${v}${un}` : null);
    const atuais = [
      f("Peso", b.pesoKg, "kg"),
      f("Gordura", b.gorduraPct, "%"),
      f("Massa magra", b.massaMagraKg, "kg"),
      f("Musc. esquelética", b.massaMuscularEsqueleticaKg, "kg"),
      f("Gordura visceral", b.gorduraVisceral),
      f("Água corporal", b.aguaCorporalPct, "%"),
      f("TMB", b.tmbKcal, "kcal"),
      f("Idade metabólica", b.idadeMetabolica),
    ].filter(Boolean);
    partes.push(`• Bioimpedância (${b.data}): ${atuais.join(", ")}`);

    if (b.analise) {
      const a = b.analise;
      const porMes = Object.entries(a.porMes)
        .map(([k, v]) => `${ROTULO_METRICA[k] ?? k} ${v > 0 ? "+" : ""}${v}/mês`)
        .join(", ");
      partes.push(
        `• Leitura de tendência calculada pelo app (${a.leituras} medições, ${a.periodo?.inicio} a ${a.periodo?.fim}): ` +
          `veredito "${a.veredito}", confiança ${a.confianca}. ${a.explicacao}` +
          (a.leituraProvisoria ? ` (sinal provisório: ${a.leituraProvisoria})` : "") +
          (porMes ? `
  Tendência: ${porMes}` : "") +
          (a.forcaVariacaoPct != null ? `
  Força (1RM médio) na janela: ${a.forcaVariacaoPct > 0 ? "+" : ""}${a.forcaVariacaoPct}%` : "") +
          (a.avisos.length ? `
  Avisos: ${a.avisos.join(" ")}` : ""),
      );
    }

    if (b.historico && b.historico.length > 1) {
      const linhas = b.historico.map(
        (h) =>
          `${h.data}${h.hora ? ` ${h.hora.slice(0, 5)}` : ""}: ${h.pesoKg ?? "?"}kg, ${h.gorduraPct ?? "?"}% gord (${h.massaGorduraKg ?? "?"}kg), massa magra ${h.massaMagraKg ?? "?"}kg, visceral ${h.gorduraVisceral ?? "?"}` +
          (h.suspeita ? `  ⚠ possível artefato: ${h.suspeita}` : ""),
      );
      partes.push(`• Histórico de bioimpedância (${b.historico.length} medições, mais antiga primeiro):\n  ${linhas.join("\n  ")}`);
    }

    if (b.segmentos && b.segmentos.length > 0) {
      const seg = b.segmentos.map(
        (x) => `${x.nome} ${x.massaMagraKg ?? "?"}kg${x.variacaoMassaMagraKg != null ? ` (${x.variacaoMassaMagraKg > 0 ? "+" : ""}${x.variacaoMassaMagraKg})` : ""}`,
      );
      partes.push(`• Massa magra por segmento (última medição, variação desde a primeira da janela): ${seg.join("; ")}`);
    }

    if (b.anterior) {
      const d = (a?: number | null, p?: number | null) =>
        a != null && p != null ? `${a - p > 0 ? "+" : ""}${Math.round((a - p) * 10) / 10}` : null;
      const vars = [
        d(b.pesoKg, b.anterior.pesoKg) && `Peso ${d(b.pesoKg, b.anterior.pesoKg)}kg`,
        d(b.gorduraPct, b.anterior.gorduraPct) && `Gordura ${d(b.gorduraPct, b.anterior.gorduraPct)}p.p.`,
        d(b.massaMagraKg, b.anterior.massaMagraKg) && `Massa magra ${d(b.massaMagraKg, b.anterior.massaMagraKg)}kg`,
        d(b.massaMuscularEsqueleticaKg, b.anterior.massaMuscularEsqueleticaKg) &&
          `Musc. esquelética ${d(b.massaMuscularEsqueleticaKg, b.anterior.massaMuscularEsqueleticaKg)}kg`,
        d(b.gorduraVisceral, b.anterior.gorduraVisceral) &&
          `Gord. visceral ${d(b.gorduraVisceral, b.anterior.gorduraVisceral)}`,
      ].filter(Boolean);
      if (vars.length > 0) {
        partes.push(
          `• Variação vs medição anterior (${b.anterior.data}${b.anterior.diasEntre != null ? `, ${b.anterior.diasEntre} dias antes` : ""}): ${vars.join(", ")}`,
        );
      }
    }
  }

  if (ctx.treinoRecente) {
    const t = ctx.treinoRecente;
    const grupos = t.seriesPorSemana.map((g) => `${g.grupo} ${g.series}`).join(", ");
    partes.push(
      `• Treino nos últimos ${t.janelaDias} dias: ${t.treinosPorSemana} treinos/semana. Séries/semana por grupo (secundários contam parcial): ${grupos}.` +
        (t.forcaVariacaoPct != null ? ` Força (1RM médio, 90 dias): ${t.forcaVariacaoPct > 0 ? "+" : ""}${t.forcaVariacaoPct}%.` : "") +
        (t.evolucao.length
          ? `
  Evolução por exercício (última sessão vs anterior): ${t.evolucao.map((e) => `${e.nome} ${e.anterior1RM}→${e.atual1RM}kg (${e.variacaoPct > 0 ? "+" : ""}${e.variacaoPct}%)`).join("; ")}`
          : ""),
    );
  }

  if (ctx.garminJanela && ctx.garminJanela.diario.length > 0) {
    const dias = ctx.garminJanela.diario;
    const mediaDe = (f: (d: GarminDia) => number | null) => {
      const v = dias.map(f).filter((x): x is number => x != null);
      return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    };
    const resumo = [
      ["sono", mediaDe((d) => d.sonoHoras), "h"],
      ["FC repouso", mediaDe((d) => d.fcRepouso), "bpm"],
      ["HRV", mediaDe((d) => d.hrvMs), "ms"],
      ["passos", mediaDe((d) => d.passos), ""],
      ["estresse", mediaDe((d) => d.estresse), ""],
    ]
      .filter(([, v]) => v != null)
      .map(([k, v, u]) => `${k} ${v}${u}`)
      .join(", ");
    const linhas = dias
      .slice(-7)
      .map((d) => `${d.data}: sono ${d.sonoHoras ?? "?"}h (score ${d.sonoScore ?? "?"}), FC rep ${d.fcRepouso ?? "?"}, HRV ${d.hrvMs ?? "?"}, passos ${d.passos ?? "?"}`);
    partes.push(
      `• Garmin, ${dias.length} dias com dados (${dias[0].data} a ${dias[dias.length - 1].data}), médias: ${resumo}.
  Últimos dias:\n  ${linhas.join("\n  ")}` +
        (ctx.garminJanela.treinos.length
          ? `
  Atividades recentes: ${ctx.garminJanela.treinos
              .slice(0, 6)
              .map((t) => `${t.data} ${t.tipo} ${t.duracaoMin ?? "?"}min FC ${t.fcMedia ?? "?"}`)
              .join("; ")}`
          : ""),
    );
    const rec = ctx.garminJanela.recuperacao;
    if (rec) {
      const itens = [
        rec.prontidaoBiofit != null ? `prontidão BioFIT ${rec.prontidaoBiofit}/100${rec.recomendacao ? ` (${rec.recomendacao})` : ""}` : null,
        rec.prontidaoGarmin != null ? `Training Readiness Garmin ${rec.prontidaoGarmin}` : null,
        rec.acwr != null ? `ACWR ${rec.acwr}` : null,
        rec.sonoProfundoMin != null && rec.sonoRemMin != null ? `sono profundo ${rec.sonoProfundoMin}min, REM ${rec.sonoRemMin}min` : null,
      ].filter(Boolean);
      if (itens.length) partes.push(`• Recuperação em ${rec.data}: ${itens.join("; ")}.` + (rec.alertas.length ? ` ATENÇÃO: ${rec.alertas.join(" ")}` : ""));
    }
  }

  if (ctx.cruzamentos && ctx.cruzamentos.length > 0) {
    const sinal = (n: number | null, un: string) => (n == null ? "?" : `${n > 0 ? "+" : ""}${n}${un}`);
    const linhas = ctx.cruzamentos.map((c) => {
      const g = c.garmin
        ? `Garmin (${c.garmin.diasComDados} dias): sono ${c.garmin.sonoHoras ?? "?"}h, FC rep ${c.garmin.fcRepouso ?? "?"}, HRV ${c.garmin.hrvMs ?? "?"}, passos ${c.garmin.passos ?? "?"}`
        : "Garmin: sem dados no intervalo";
      return `${c.de} → ${c.ate} (${c.dias} dias): peso ${sinal(c.delta.pesoKg, "kg")}, gordura ${sinal(c.delta.gorduraPp, "p.p.")}, massa magra ${sinal(c.delta.massaMagraKg, "kg")} | treino: ${c.treino.treinosPorSemana}/semana, ${c.treino.seriesPorSemana} séries/semana | ${g}`;
    });
    partes.push(`• Cruzamento por intervalo entre medições (o que mudou no corpo × o que aconteceu no meio):\n  ${linhas.join("\n  ")}`);
  }

  if (ctx.exercicioAtual) {
    const ex = ctx.exercicioAtual;
    partes.push(
      `• Exercício Ativo no Momento: ${ex.nome} (${ex.grupoMuscular})
  - Tipo: ${ex.composto ? "Composto (RIR alvo 1-2)" : "Isolado (RIR alvo 0-1)"}
  - Prescrição: ${ex.seriesPrescritas} séries de ${ex.repsPrescritas} (Descanso: ${ex.descanso})
  - Partida/Referência: ${ex.partida} kg${ex.notas ? `\n  - Notas do plano: ${ex.notas}` : ""}`,
    );
  }

  if (ctx.seriesHoje && ctx.seriesHoje.length > 0) {
    const seriesTxt = ctx.seriesHoje
      .map(
        (s) =>
          `Série ${s.serieNumero}: ${s.cargaKg ?? 0}kg x ${s.reps ?? 0} reps${s.rir != null ? ` (RIR ${s.rir})` : ""}`,
      )
      .join(", ");
    partes.push(`• Séries Registradas Hoje: ${seriesTxt}`);
  }

  if (ctx.historicoUltimaSessao && ctx.historicoUltimaSessao.length > 0) {
    const ultTxt = ctx.historicoUltimaSessao
      .map(
        (s) =>
          `S${s.serieNumero}: ${s.cargaKg ?? 0}kg x ${s.reps ?? 0} reps${s.rir != null ? ` (RIR ${s.rir})` : ""}`,
      )
      .join(", ");
    partes.push(`• Última Sessão Realizada (${ctx.historicoUltimaSessao[0].data}): ${ultTxt}`);
  }

  if (ctx.recorde1RM) {
    partes.push(`• Recorde Pessoal Estimado (1RM): ~${ctx.recorde1RM.toFixed(1)} kg`);
  }

  return partes.join("\n");
}
