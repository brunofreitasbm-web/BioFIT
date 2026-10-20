import { diasEntre } from "@/lib/corpo";
import { analisarPostura, LEMBRETE_DIAS, ordenarPostura, sessoesPorDia } from "@/lib/postura";
import { numArg, type Contexto, type FerramentaLeitura } from "./comum";

// Postura avaliada por foto no app (cifose por três pontos marcados nas costas, ângulo
// craniovertebral, inclinação do tronco e dos pares frontais). Só leitura: as capturas são
// feitas no app, que não guarda a foto, só os pontos e os ângulos.

export function blocoPostura(ctx: Contexto) {
  const regs = ordenarPostura(ctx.dados.postura);
  if (regs.length === 0) return null;
  const ultima = regs[regs.length - 1];
  const dias = diasEntre(ultima.data, ctx.hoje);
  const perfil = sessoesPorDia(regs, "perfil");
  return {
    ultimaSessaoPerfil: perfil.length ? perfil[perfil.length - 1] : null,
    diasDesdeUltima: dias,
    lembrete: dias > LEMBRETE_DIAS ? `Última avaliação postural há ${dias} dias.` : null,
  };
}

export const POSTURA_LEITURA: FerramentaLeitura[] = [
  {
    tipo: "leitura",
    name: "evolucao_postura",
    description:
      "Evolução postural medida por foto no app: ângulo de cifose torácica e índice de cifose (três pontos tocados nas costas na foto de perfil: C7, ápice, T12, com a conta do flexicurve), ângulo craniovertebral (cabeça à frente), inclinação do tronco e, na vista frontal, inclinação de olhos, ombros, quadril e joelhos. Cada sessão é a mediana das capturas do dia; a tendência é por data. É medida de foto, não diagnóstico: diferença de 2–3° entre sessões é ruído de protocolo. Respeite o veredito ('dados_insuficientes', 'dentro_do_ruido', 'cifose_melhorando', 'cifose_piorando', 'misto'), a confiança e os avisos ao explicar.",
    inputSchema: {
      type: "object",
      properties: { limite: { type: "integer", minimum: 1, maximum: 60, description: "Quantas sessões mais recentes por vista na série. Padrão 12." } },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const regs = ordenarPostura(ctx.dados.postura);
      if (regs.length === 0) {
        return { capturas: 0, mensagem: "Nenhuma avaliação postural ainda. No app: Relatório → Postura → Nova avaliação." };
      }
      const limite = numArg(args, "limite", 12, 1, 60);
      const analise = analisarPostura(regs, { hoje: ctx.hoje });
      return {
        hoje: ctx.hoje,
        totalCapturas: regs.length,
        perfil: sessoesPorDia(regs, "perfil").slice(-limite),
        frontal: sessoesPorDia(regs, "frontal").slice(-limite),
        analise,
      };
    },
  },
];
