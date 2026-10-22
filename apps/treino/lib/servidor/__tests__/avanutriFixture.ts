// Relatório sintético no formato da API da Avanutri (valores inventados). Inclui de propósito
// dados pessoais e um campo `password` para provar que nada disso é guardado.
export const SEGREDO = "SEGREDO-QUE-NAO-PODE-SER-GUARDADO";
export const NOME_PESSOA = "Fulano de Tal Teste";
export const CODIGO = "11111111-2222-4333-8444-555555555555";
export const LINK = `https://d196bwsv53491l.cloudfront.net/relatorios/index.html?lang=pt#${CODIGO}`;

export interface OpcoesAvaliacao {
  data: string; // "2026-07-20T08:05:11.123456"
  peso?: number;
  gordura?: number; // %
  ffm?: number;
  ssm?: number;
}

export function avaliacao(i: number, o: OpcoesAvaliacao) {
  const peso = o.peso ?? 90;
  const gordura = o.gordura ?? 24;
  const fm = (peso * gordura) / 100;
  return {
    id: 1000 + i,
    pacienteId: 7,
    data: o.data,
    peso,
    estatura: 1.72,
    idade: 38,
    modeloBalanca: 0,
    taxaMetabolicaBasal: 1850,
    idadeMetabolica: 36,
    dadosCorpo: {
      fmPercentual: gordura,
      fm,
      ffm: o.ffm ?? peso - fm,
      ssm: o.ssm ?? 41,
      tbw: 47,
      icw: 27,
      ecw: 20,
      vfl: 10,
      bmi: 30.4,
      proteina: 17.6,
      bmCmineral: 4.8,
    },
    // braço D, braço E, tronco, perna D, perna E
    dadosMembros: [4.8, 4.7, 30, 11.5, 11.4].map((ffm, k) => ({
      membro: k,
      composicaoCorporal: { ffm, fm: 0.3 + k, smm: 12.4 },
    })),
  };
}

export function relatorioFalso(avaliacoes: ReturnType<typeof avaliacao>[]) {
  return {
    avaliacoes,
    paciente: { nome: NOME_PESSOA, email: "pessoa@example.com", telefone: "00000000000", estaturaCm: 172, sexo: 0 },
    user: { nome: "Profissional Teste", email: "pro@example.com", password: SEGREDO, clinicaCNPJ: "00.000.000/0000-00", crn: "CRN-0" },
    normalidades: {},
  };
}

// Seis medições quinzenais, em horários parecidos (manhã) e de manhã/noite alternados.
export const DATAS_MANHA = [
  "2026-07-20T08:05:11.123456",
  "2026-08-03T08:12:00.000000",
  "2026-08-17T07:58:30.000000",
  "2026-08-31T08:20:10.000000",
  "2026-09-14T08:01:00.000000",
  "2026-09-28T08:30:45.000000",
];
export const DATAS_MISTAS = [
  "2026-07-20T23:05:11.123456",
  "2026-08-03T08:12:00.000000",
  "2026-08-17T17:58:30.000000",
  "2026-08-31T21:20:10.000000",
  "2026-09-14T10:01:00.000000",
  "2026-09-28T14:30:45.000000",
];
