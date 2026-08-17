import type { RegistroBioimpedancia } from "./tipos";
import { getRegistrosBioimpedanciaSalvos } from "./storage";

// Extraído dos 6 "Relatório de Avaliações" (bioimpedância InBody, Clínica Porto Terapia) em
// bioimpedância Bruno/*.pdf — serve de histórico inicial até o usuário registrar novas medições.
export const REGISTROS_SEED: RegistroBioimpedancia[] = [
  {
    data: "2026-03-08",
    pesoKg: 90.0,
    percentualGordura: 22.5,
    massaGorduraKg: 20.3,
    massaLivreGorduraKg: 64.5,
    aguaCorporalL: 47.2,
    imc: 29.7,
    taxaMetabolicaBasalKcal: 1916,
    indiceApendicular: 10.18,
    idadeMetabolica: 36,
    nivelGorduraVisceral: 9,
    massaMagraSegmentar: { bracoDireitoKg: 4.5, bracoEsquerdoKg: 4.5, troncoKg: 33.7, pernaDireitaKg: 10.8, pernaEsquerdaKg: 11.0 },
  },
  {
    data: "2026-03-24",
    pesoKg: 90.7,
    percentualGordura: 20.5,
    massaGorduraKg: 18.6,
    massaLivreGorduraKg: 66.8,
    aguaCorporalL: 48.9,
    imc: 30.0,
    taxaMetabolicaBasalKcal: 1925,
    indiceApendicular: 10.57,
    idadeMetabolica: 35,
    nivelGorduraVisceral: 8,
    massaMagraSegmentar: { bracoDireitoKg: 4.8, bracoEsquerdoKg: 4.8, troncoKg: 34.8, pernaDireitaKg: 11.1, pernaEsquerdaKg: 11.3 },
  },
  {
    data: "2026-04-13",
    pesoKg: 91.3,
    percentualGordura: 20.1,
    massaGorduraKg: 18.4,
    massaLivreGorduraKg: 67.6,
    aguaCorporalL: 49.5,
    imc: 30.2,
    taxaMetabolicaBasalKcal: 1934,
    indiceApendicular: 10.59,
    idadeMetabolica: 35,
    nivelGorduraVisceral: 8,
    massaMagraSegmentar: { bracoDireitoKg: 4.8, bracoEsquerdoKg: 4.8, troncoKg: 35.6, pernaDireitaKg: 11.2, pernaEsquerdaKg: 11.3 },
  },
  {
    data: "2026-04-27",
    pesoKg: 90.5,
    percentualGordura: 19.8,
    massaGorduraKg: 17.9,
    massaLivreGorduraKg: 67.4,
    aguaCorporalL: 49.3,
    imc: 29.9,
    taxaMetabolicaBasalKcal: 1923,
    indiceApendicular: 10.74,
    idadeMetabolica: 35,
    nivelGorduraVisceral: 8,
    massaMagraSegmentar: { bracoDireitoKg: 4.7, bracoEsquerdoKg: 4.8, troncoKg: 34.8, pernaDireitaKg: 11.4, pernaEsquerdaKg: 11.6 },
  },
  {
    data: "2026-05-17",
    pesoKg: 90.2,
    percentualGordura: 19.0,
    massaGorduraKg: 17.2,
    massaLivreGorduraKg: 67.8,
    aguaCorporalL: 49.6,
    imc: 29.8,
    taxaMetabolicaBasalKcal: 1919,
    indiceApendicular: 10.89,
    idadeMetabolica: 34,
    nivelGorduraVisceral: 7,
    massaMagraSegmentar: { bracoDireitoKg: 4.8, bracoEsquerdoKg: 4.8, troncoKg: 34.8, pernaDireitaKg: 11.6, pernaEsquerdaKg: 11.8 },
  },
  {
    data: "2026-06-03",
    pesoKg: 90.3,
    percentualGordura: 22.9,
    massaGorduraKg: 20.7,
    massaLivreGorduraKg: 64.4,
    aguaCorporalL: 47.1,
    imc: 29.8,
    taxaMetabolicaBasalKcal: 1920,
    indiceApendicular: 10.37,
    idadeMetabolica: 36,
    nivelGorduraVisceral: 9,
    massaMagraSegmentar: { bracoDireitoKg: 4.7, bracoEsquerdoKg: 4.7, troncoKg: 33.0, pernaDireitaKg: 10.9, pernaEsquerdaKg: 11.1 },
  },
];

export const ALTURA_M = 1.74;

// Combina o histórico inicial (planilha/PDFs) com o que o usuário for registrando depois —
// um registro novo na mesma data substitui o do histórico.
export function todosRegistrosBioimpedancia(): RegistroBioimpedancia[] {
  const salvos = getRegistrosBioimpedanciaSalvos();
  const porData = new Map<string, RegistroBioimpedancia>();
  for (const r of REGISTROS_SEED) porData.set(r.data, r);
  for (const r of Object.values(salvos)) porData.set(r.data, r);
  return Array.from(porData.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export interface InsightBioimpedancia {
  titulo: string;
  mensagem: string;
  positivo: boolean;
}

// Insights simples por regra (comparando a 1ª com a última medição) — o agente de IA (Gemini)
// substitui/complementa isso quando a chave de API estiver configurada.
export function gerarInsightsBasicos(registros: RegistroBioimpedancia[]): InsightBioimpedancia[] {
  if (registros.length < 2) return [];
  const primeiro = registros[0];
  const ultimo = registros[registros.length - 1];
  const insights: InsightBioimpedancia[] = [];

  const deltaMassaLivre = ultimo.massaLivreGorduraKg - primeiro.massaLivreGorduraKg;
  const deltaGordura = ultimo.massaGorduraKg - primeiro.massaGorduraKg;
  const deltaPeso = ultimo.pesoKg - primeiro.pesoKg;

  insights.push({
    titulo: "Massa livre de gordura (músculo + água + ossos)",
    mensagem: `${deltaMassaLivre >= 0 ? "+" : ""}${deltaMassaLivre.toFixed(1)} kg desde ${formatarDataBR(primeiro.data)} (${primeiro.massaLivreGorduraKg}kg → ${ultimo.massaLivreGorduraKg}kg).`,
    positivo: deltaMassaLivre >= 0,
  });

  insights.push({
    titulo: "Massa de gordura",
    mensagem: `${deltaGordura >= 0 ? "+" : ""}${deltaGordura.toFixed(1)} kg no mesmo período (${primeiro.massaGorduraKg}kg → ${ultimo.massaGorduraKg}kg).`,
    positivo: deltaGordura <= 0,
  });

  if (Math.abs(deltaPeso) < 1 && deltaMassaLivre > 0.5 && deltaGordura < -0.5) {
    insights.push({
      titulo: "Recomposição corporal",
      mensagem: `Peso quase estável (${deltaPeso >= 0 ? "+" : ""}${deltaPeso.toFixed(1)}kg) com ganho de massa livre de gordura e queda de gordura — sinal clássico de recomposição, coerente com a fase de manutenção do programa.`,
      positivo: true,
    });
  }

  const ultimaMedicao = registros[registros.length - 1];
  const penultima = registros.length >= 2 ? registros[registros.length - 2] : null;
  if (penultima && ultimaMedicao.percentualGordura - penultima.percentualGordura >= 2) {
    insights.push({
      titulo: "Última medição em alta",
      mensagem: `% de gordura subiu de ${penultima.percentualGordura}% para ${ultimaMedicao.percentualGordura}% na medição mais recente (${formatarDataBR(penultima.data)} → ${formatarDataBR(ultimaMedicao.data)}) — vale conferir hidratação/horário do exame antes de tirar conclusões de uma única leitura.`,
      positivo: false,
    });
  }

  return insights;
}

export function formatarDataBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
