import { diasEntre } from "@/lib/corpo";
import { lerGarmin, type LinhaGarmin } from "../garmin";
import { numArg, type FerramentaLeitura } from "./comum";

// Recuperação medida pelo relógio Garmin (Health API → Supabase). Só leitura: devolve os números
// e a idade do último dado; quem interpreta é o Claude, com os avisos abaixo.

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arred = (n: number, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas;

function media(linhas: LinhaGarmin[], campo: (l: LinhaGarmin) => number | null): number | null {
  const v = linhas.map(campo).filter((n): n is number => n !== null);
  return v.length ? arred(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export const GARMIN_LEITURA: FerramentaLeitura[] = [
  {
    tipo: "leitura",
    name: "recuperacao_garmin",
    description:
      "Recuperação medida pelo relógio Garmin: sono (horas e score), VFC noturna (ms), Body Battery, FC de repouso, estresse médio, passos e atividades gravadas pelo relógio, por dia, com médias de 7 dias e comparação com os 21 dias anteriores. Sempre olhe 'diasDesdeUltimoDado' antes de falar de hoje: se for maior que 0, o relógio ainda não sincronizou e o que existe é de outro dia. Body Battery ao acordar é aproximado (maior valor da manhã) e a Garmin não informa o status da VFC; use a tendência contra a própria média, não valores absolutos. Um dia de sono ruim ou VFC baixa isolada não justifica mudar o treino; peça atenção a 3+ dias seguidos.",
    inputSchema: {
      type: "object",
      properties: { dias: { type: "integer", minimum: 1, maximum: 35, description: "Quantos dias mais recentes na série. Padrão 14." } },
      additionalProperties: false,
    },
    async executar(args, ctx) {
      const dias = numArg(args, "dias", 14, 1, 35);
      const dados = await lerGarmin();
      const diario = (dados?.diario ?? []).filter((l) => typeof l.data === "string").sort((a, b) => b.data.localeCompare(a.data));
      if (diario.length === 0) {
        return { disponivel: false, mensagem: "Nenhum dado do Garmin recebido ainda. Confira a Health API / webhook do BioFIT." };
      }

      const linha = (l: LinhaGarmin) => {
        const sono = num(l.sono_minutos);
        return {
          data: l.data as string,
          sonoHoras: sono === null ? null : arred(sono / 60),
          sonoScore: num(l.sono_score),
          hrvMs: num(l.vfc_noturna_ms),
          fcRepouso: num(l.fc_repouso_bpm),
          bodyBatteryAcordar: num(l.body_battery_acordar),
          bodyBatteryMax: num(l.body_battery_max),
          estresse: num(l.estresse_medio),
          passos: num(l.passos),
        };
      };
      const serie = diario.slice(0, dias).map(linha);
      const recentes = diario.slice(0, 7).map(linha);
      const anteriores = diario.slice(7, 28).map(linha);
      const resumo = (ls: ReturnType<typeof linha>[]) => ({
        dias: ls.length,
        sonoHoras: media(ls, (l) => l.sonoHoras),
        hrvMs: media(ls, (l) => l.hrvMs),
        fcRepouso: media(ls, (l) => l.fcRepouso),
        bodyBatteryAcordar: media(ls, (l) => l.bodyBatteryAcordar),
        estresse: media(ls, (l) => l.estresse),
      });
      const ultimo = serie[0];

      return {
        hoje: ctx.hoje,
        ultimoDado: ultimo.data,
        diasDesdeUltimoDado: diasEntre(ultimo.data, ctx.hoje),
        ultimoDia: ultimo,
        mediaUltimos7Dias: resumo(recentes),
        mediaDos21DiasAnteriores: anteriores.length >= 7 ? resumo(anteriores) : null,
        serie: serie.slice().reverse(),
        atividades: (dados?.treinos ?? []).slice(0, 10).map((t) => ({
          data: typeof t.biofit_sessao_data === "string" ? t.biofit_sessao_data : String(t.inicio_utc ?? "").slice(0, 10),
          tipo: String(t.tipo ?? ""),
          duracaoMin: num(t.duracao_s) === null ? null : Math.round((t.duracao_s as number) / 60),
          fcMedia: num(t.fc_media),
          calorias: num(t.calorias),
        })),
        avisos: [
          ...(anteriores.length < 7 ? ["Menos de 28 dias de histórico: a comparação com a média anterior não é confiável."] : []),
          ...(diasEntre(ultimo.data, ctx.hoje) > 0 ? ["Sem dado de hoje: o relógio ainda não sincronizou."] : []),
        ],
      };
    },
  },
];
