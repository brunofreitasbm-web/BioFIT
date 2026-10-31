import { media } from "@/lib/recuperacao/estatistica";
import { forcaPorDia, montarDadosPainel, type DadosPainel } from "@/lib/recuperacao/painel";
import { lerGarminSupabase, montarPainelGarmin } from "../garmin";
import { numArg, type Contexto, type FerramentaLeitura } from "./comum";

// Recuperação (Garmin) cruzada com as séries de força do BioFIT. Lê as tabelas biofit_garmin_*
// pela RPC biofit_garmin_janela. Se o Garmin ainda não sincronizou, avisa em vez de falhar.

const SEM_GARMIN = { disponivel: false, mensagem: "Sem dados Garmin no servidor. Rode a sincronização (sync-garmin.bat) no computador." };
const r1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

async function carregar(ctx: Contexto, dias: number): Promise<DadosPainel | null> {
  const brutos = await lerGarminSupabase(dias);
  if (!brutos || brutos.diario.length === 0) return null;
  return montarDadosPainel(montarPainelGarmin(brutos), forcaPorDia(ctx.dados.log));
}

export const RECUPERACAO_LEITURA: FerramentaLeitura[] = [
  {
    tipo: "leitura",
    name: "prontidao_hoje",
    description:
      "Prontidão para treinar hoje (0–100) calculada contra a linha de base pessoal de VFC, FC de repouso, sono, Body Battery e carga dos últimos 3 dias, com a recomendação (pesado, moderado, leve, recuperar). Devolve também o Training Readiness da Garmin para comparar, o ACWR (carga aguda ÷ crônica; 0,8–1,3 é a faixa segura) e os alertas ativos (ex.: sinais precoces de doença). Respeite a confiança: com menos de 14 dias de VFC a linha de base é fraca.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async executar(_args, ctx) {
      const d = await carregar(ctx, 180);
      if (!d) return SEM_GARMIN;
      const ultimo = d.painel.dias[d.painel.dias.length - 1];
      return {
        disponivel: true,
        data: d.hoje,
        prontidao: d.prontidaoHoje,
        garmin: { trainingReadiness: ultimo.prontidaoGarmin, nivel: ultimo.prontidaoNivel, statusTreino: ultimo.statusTreino },
        carga: d.resumo,
        alertas: d.insights.filter((i) => i.id === "alerta-precoce").map((i) => i.resumo),
      };
    },
  },
  {
    tipo: "leitura",
    name: "recuperacao_periodo",
    description:
      "Série diária de recuperação do Garmin (sono total e por fase, VFC, FC de repouso, Body Battery ao acordar, estresse, respiração, prontidão Garmin e a do BioFIT) e médias do período. Use para ver tendência, não um dia isolado.",
    inputSchema: {
      type: "object",
      properties: { dias: { type: "integer", minimum: 3, maximum: 120, description: "Quantos dias recentes. Padrão 30." } },
      additionalProperties: false,
    },
    async executar(args, ctx) {
      const dias = numArg(args, "dias", 30, 3, 120);
      const d = await carregar(ctx, 180);
      if (!d) return SEM_GARMIN;
      const recorte = d.painel.dias.slice(-dias);
      const porData = new Map(d.prontidaoSerie.map((p) => [p.data, p.score]));
      return {
        disponivel: true,
        dias: recorte.length,
        medias: {
          sonoHoras: r1(media(recorte.map((x) => (x.sonoMin === null ? null : x.sonoMin / 60)))),
          vfcMs: r1(media(recorte.map((x) => x.hrvMs))),
          fcRepouso: r1(media(recorte.map((x) => x.fcRepouso))),
          bodyBattery: r1(media(recorte.map((x) => x.bodyBatteryAcordar))),
          estresse: r1(media(recorte.map((x) => x.estresse))),
        },
        serie: recorte.map((x) => ({
          data: x.data,
          sonoMin: x.sonoMin,
          profundoMin: x.sonoProfundoMin,
          remMin: x.sonoRemMin,
          vfcMs: x.hrvMs,
          fcRepouso: x.fcRepouso,
          bodyBattery: x.bodyBatteryAcordar,
          estresse: x.estresse,
          respiracao: x.respiracao,
          prontidaoGarmin: x.prontidaoGarmin,
          prontidaoBiofit: porData.get(x.data) ?? null,
        })),
      };
    },
  },
  {
    tipo: "leitura",
    name: "insights_cruzados",
    description:
      "Cruzamentos treino × recuperação: dias para recuperar de um treino (VFC nos 3 dias seguintes à carga), sono profundo+REM × séries feitas, horário do treino × sono profundo, alerta precoce de doença e dia da semana de melhor recuperação. Cada insight traz n (pares usados), correlação e confiança. Com poucas semanas de Garmin quase tudo é 'baixa': diga isso ao explicar, e trate como indício, não como causa.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async executar(_args, ctx) {
      const d = await carregar(ctx, 400);
      if (!d) return SEM_GARMIN;
      return {
        disponivel: true,
        diasDeGarmin: d.painel.dias.length,
        insights: d.insights.map(({ pontos: _pontos, ...resto }) => resto),
      };
    },
  },
];
