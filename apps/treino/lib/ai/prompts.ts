import type { ExercicioEfetivo, SerieRegistrada, SessaoTreino } from "../tipos";
import type { StatusPrograma } from "../program";

export interface BioimpedanciaContexto {
  data: string;
  pesoKg?: number | null;
  gorduraPct?: number | null;
  massaMagraKg?: number | null;
  massaMuscularEsqueleticaKg?: number | null;
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

5. **Diretrizes de Comunicação**:
   - **Conciso e direto ao ponto**: Responda com clareza imediata. O usuário está no intervalo do exercício ou montando a barra.
   - **Formatação limpa**: Use tópicos curtos, negrito para números e cargas sugeridas.
   - **Segurança primeiro**: Se o atleta relatar dor articular (tendão, ombro, lombar), priorize orientações biomecânicas ou sugira substituições equivalentes seguras.
   - **Tom**: Profissional, científico, encorajador e prático. Em português do Brasil.
`.trim();

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
