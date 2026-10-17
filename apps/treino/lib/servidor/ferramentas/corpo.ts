import { KEY_CORPO, KEY_REMOVIDOS } from "@/lib/dados";
import { analisarCorpo, diasEntre, LEMBRETE_DIAS, ordenarCorpo, periodoDoDia, resumoSegmentos } from "@/lib/corpo";
import { chaveCorpo, registrarRemocao } from "@/lib/merge";
import type { RegistroCorpo } from "@/lib/tipos";
import { buscarRelatorio, extrairIdRelatorio, normalizarRelatorio } from "../avanutri";
import { dataArg, numArg, removidosDe, type Contexto, type FerramentaEscrita, type FerramentaLeitura } from "./comum";

const semRegistradoEm = (r: RegistroCorpo) => JSON.stringify({ ...r, registradoEm: "" });

export function resumoLeitura(r: RegistroCorpo) {
  return {
    data: r.data,
    hora: r.quando.slice(11, 16),
    periodo: periodoDoDia(r.quando),
    pesoKg: r.pesoKg,
    gorduraPct: r.gorduraPct,
    massaGordaKg: r.massaGordaKg,
    massaLivreKg: r.massaLivreKg,
    musculoEsqueleticoKg: r.musculoEsqueleticoKg,
    aguaTotalL: r.aguaTotalL,
    gorduraVisceral: r.gorduraVisceral,
    imc: r.imc,
    tmbKcal: r.tmbKcal,
  };
}

// Bloco curto para o relatório semanal.
export function blocoCorpo(ctx: Contexto) {
  const regs = ordenarCorpo(ctx.dados.corpo);
  if (regs.length === 0) return null;
  const ultima = regs[regs.length - 1];
  const dias = diasEntre(ultima.data, ctx.hoje);
  return {
    ultima: resumoLeitura(ultima),
    diasDesdeUltima: dias,
    lembrete: dias > LEMBRETE_DIAS ? `Última bioimpedância há ${dias} dias.` : null,
  };
}

export const CORPO_LEITURA: FerramentaLeitura[] = [
  {
    tipo: "leitura",
    name: "evolucao_corpo",
    description:
      "Evolução da composição corporal (bioimpedância Avanutri): série de medições com hora do dia, tendência por mês (por data, não por posição), massa magra por segmento e uma leitura cruzada com a força do treino. A bioimpedância é ruidosa: o veredito pode ser 'dentro_do_ruido' ou 'dados_insuficientes', e a confiança cai quando as medições foram feitas em horários muito diferentes. Respeite esses avisos ao explicar.",
    inputSchema: {
      type: "object",
      properties: { limite: { type: "integer", minimum: 1, maximum: 60, description: "Quantas medições mais recentes na série. Padrão 12." } },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const regs = ordenarCorpo(ctx.dados.corpo);
      if (regs.length === 0) {
        return {
          leituras: 0,
          mensagem: "Nenhuma bioimpedância importada. Use importar_bioimpedancia com o link do e-mail “Relatório bioimpedância”.",
        };
      }
      const limite = numArg(args, "limite", 12, 1, 60);
      const analise = analisarCorpo(regs, { hoje: ctx.hoje, log: ctx.dados.log });
      const naJanela = analise.periodo ? regs.filter((r) => r.data >= analise.periodo!.inicio && r.data <= analise.periodo!.fim) : [];
      return {
        hoje: ctx.hoje,
        totalMedicoes: regs.length,
        serie: regs.slice(-limite).map(resumoLeitura),
        analise,
        segmentos: resumoSegmentos(naJanela),
        lembrete: blocoCorpo(ctx)?.lembrete ?? null,
      };
    },
  },
];

export const CORPO_ESCRITA: FerramentaEscrita[] = [
  {
    tipo: "escrita",
    name: "importar_bioimpedancia",
    destrutiva: false,
    idempotente: true,
    description:
      "Importa medições de bioimpedância a partir do link do botão “Acessar Relatório” do e-mail “Relatório bioimpedância” (noreply@avanutrionline.com). Cada link traz as 6 medições mais recentes até aquela data; reimportar não duplica (cada medição tem id próprio). Para carregar o histórico, importe o link mais recente e o de uma medição mais antiga que cubra o início. Só são guardados os dados de medição.",
    inputSchema: {
      type: "object",
      properties: { link: { type: "string", description: "Link do e-mail (…/relatorios/index.html?lang=pt#<código>) ou só o código." } },
      required: ["link"],
      additionalProperties: false,
    },
    async escrever(args, ctx) {
      const id = extrairIdRelatorio(args.link);
      const json = await buscarRelatorio(id);
      const { registros, ignoradas } = normalizarRelatorio(json, new Date().toISOString());
      if (registros.length === 0) throw new Error("O relatório não trouxe nenhuma medição válida.");

      const existentes = ctx.dados.corpo;
      const novas = registros.filter((r) => !existentes[r.chave]);
      const atualizadas = registros.filter((r) => existentes[r.chave] && semRegistradoEm(existentes[r.chave]) !== semRegistradoEm(r));
      const gravar = [...novas, ...atualizadas];
      const entrada: Record<string, string> = gravar.length
        ? { [KEY_CORPO]: JSON.stringify(Object.fromEntries(gravar.map((r) => [r.chave, r]))) }
        : {};
      const datas = (lista: RegistroCorpo[]) => lista.map((r) => r.quando.slice(0, 16)).sort();
      return {
        entrada,
        mensagem: gravar.length
          ? `${novas.length} medição(ões) nova(s)${atualizadas.length ? ` e ${atualizadas.length} atualizada(s)` : ""} importada(s); ${registros.length - gravar.length} já existia(m).`
          : `Nada novo: as ${registros.length} medições do relatório já estavam importadas.`,
        detalhe: {
          noRelatorio: registros.length,
          novas: datas(novas),
          atualizadas: datas(atualizadas),
          jaExistiam: registros.length - gravar.length,
          ignoradas,
          totalNoApp: Object.keys(existentes).length + novas.length,
        },
      };
    },
  },
  {
    tipo: "escrita",
    name: "remover_corpo",
    destrutiva: true,
    idempotente: true,
    description: "Apaga as medições de bioimpedância de uma data (por exemplo, uma medição errada). A remoção também vale no app depois do sync.",
    inputSchema: {
      type: "object",
      properties: { data: { type: "string", description: "YYYY-MM-DD da medição." } },
      required: ["data"],
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data");
      if (!data) throw new Error('"data" é obrigatório.');
      const alvo = Object.values(ctx.dados.corpo).filter((r) => r.data === data);
      if (alvo.length === 0) throw new Error(`Não há medição em ${data}.`);
      const agora = new Date().toISOString();
      const lapides = alvo.reduce((lista, r) => registrarRemocao(lista, chaveCorpo(r.chave), agora), removidosDe(ctx));
      return {
        entrada: { [KEY_REMOVIDOS]: JSON.stringify(lapides) },
        mensagem: `${alvo.length} medição(ões) de ${data} removida(s).`,
      };
    },
  },
];
