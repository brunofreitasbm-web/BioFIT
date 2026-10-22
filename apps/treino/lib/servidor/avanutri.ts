import type { NomeSegmento, RegistroCorpo, SegmentoCorpo } from "@/lib/tipos";

// Importação dos relatórios de bioimpedância da Avanutri (balança AvaBio).
//
// O e-mail "Relatório bioimpedância" traz um link `…/relatorios/index.html?lang=pt#<código>`.
// A página só monta a tela: os dados vêm de `GET balancaapi.avanutrionline.com/Relatorio/<código>`,
// que devolve as últimas 6 medições até aquela data.
//
// Segurança:
//  - o código é validado como UUID e o host da API é fixo: a ferramenta não consegue ser usada
//    para fazer o servidor chamar outro endereço;
//  - a resposta traz também dados pessoais da pessoa avaliada e da conta do profissional (inclusive
//    um campo `password`). Aqui só os campos de medição são copiados; o resto é descartado sem
//    ser lido nem registrado em log. O código do link também não é guardado.

const HOST_RELATORIO = "d196bwsv53491l.cloudfront.net";
const CAMINHO_RELATORIO = "/relatorios/index.html";
const URL_API = "https://balancaapi.avanutrionline.com/Relatorio/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAMANHO_MAX = 500_000;
const TIMEOUT_MS = 10_000;

// Aceita o link do e-mail ou só o código.
export function extrairIdRelatorio(entrada: unknown): string {
  if (typeof entrada !== "string" || !entrada.trim()) throw new Error('"link" é obrigatório.');
  const texto = entrada.trim();
  if (UUID.test(texto)) return texto.toLowerCase();
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new Error("Link inválido: use o link do botão “Acessar Relatório” do e-mail da Avanutri.");
  }
  const codigo = url.hash.replace(/^#/, "");
  if (url.protocol !== "https:" || url.hostname !== HOST_RELATORIO || url.pathname !== CAMINHO_RELATORIO || !UUID.test(codigo)) {
    throw new Error("Link inválido: use o link do botão “Acessar Relatório” do e-mail da Avanutri.");
  }
  return codigo.toLowerCase();
}

export async function buscarRelatorio(id: string, buscar: typeof fetch = fetch): Promise<unknown> {
  if (!UUID.test(id)) throw new Error("Código de relatório inválido.");
  let res: Response;
  try {
    res = await buscar(URL_API + id, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error("Não consegui falar com a API da Avanutri (rede ou tempo esgotado).");
  }
  if (res.status === 404) throw new Error("Relatório não encontrado na Avanutri (link antigo ou inválido).");
  if (!res.ok) throw new Error(`A API da Avanutri respondeu ${res.status}.`);
  const texto = await res.text();
  if (texto.length > TAMANHO_MAX) throw new Error("Resposta da Avanutri grande demais.");
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("Resposta da Avanutri não é um JSON válido.");
  }
}

function num(v: unknown, min: number, max: number, casas = 2): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) return null;
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

const DATA_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/;

// A ordem de `dadosMembros` é a que o próprio relatório usa nos gráficos.
const SEGMENTOS: NomeSegmento[] = ["bracoDireito", "bracoEsquerdo", "tronco", "pernaDireita", "pernaEsquerda"];

function segmentoDe(m: unknown): SegmentoCorpo {
  const c = (m as { composicaoCorporal?: Record<string, unknown> } | null)?.composicaoCorporal ?? {};
  return { massaMagraKg: num(c.ffm, 0, 100), massaGordaKg: num(c.fm, 0, 100) };
}

export interface ResultadoNormalizacao {
  registros: RegistroCorpo[];
  ignoradas: number;
}

// Copia só o que é medição. Avaliações sem data ou com peso fora de 20–400 kg são ignoradas.
export function normalizarRelatorio(json: unknown, registradoEm: string): ResultadoNormalizacao {
  const avaliacoes = (json as { avaliacoes?: unknown } | null)?.avaliacoes;
  if (!Array.isArray(avaliacoes)) throw new Error("Resposta da Avanutri sem a lista de avaliações.");
  const registros: RegistroCorpo[] = [];
  let ignoradas = 0;
  for (const a of avaliacoes as Record<string, unknown>[]) {
    const dh = typeof a?.data === "string" ? DATA_HORA.exec(a.data) : null;
    const peso = num(a?.peso, 20, 400);
    if (!dh || peso === null) {
      ignoradas++;
      continue;
    }
    const idBruto = typeof a.id === "string" || typeof a.id === "number" ? String(a.id) : "";
    const id = /^[\w-]{1,64}$/.test(idBruto) ? idBruto : `${dh[1]}T${dh[2]}`;
    const corpo = (a.dadosCorpo ?? {}) as Record<string, unknown>;
    const membros = Array.isArray(a.dadosMembros) ? (a.dadosMembros as unknown[]) : [];
    registros.push({
      chave: `avanutri:${id}`,
      fonte: "avanutri",
      data: dh[1],
      quando: `${dh[1]}T${dh[2]}`,
      pesoKg: peso,
      gorduraPct: num(corpo.fmPercentual, 1, 80),
      massaGordaKg: num(corpo.fm, 0, 300),
      massaLivreKg: num(corpo.ffm, 0, 300),
      musculoEsqueleticoKg: num(corpo.ssm, 0, 150),
      aguaTotalL: num(corpo.tbw, 0, 200),
      aguaIntraL: num(corpo.icw, 0, 150),
      aguaExtraL: num(corpo.ecw, 0, 100),
      gorduraVisceral: num(corpo.vfl, 0, 100, 1),
      imc: num(corpo.bmi, 5, 100, 1),
      proteinaKg: num(corpo.proteina, 0, 100),
      mineraisKg: num(corpo.bmCmineral, 0, 50),
      tmbKcal: num(a.taxaMetabolicaBasal, 300, 6000, 0),
      idadeMetabolica: num(a.idadeMetabolica, 5, 120, 0),
      segmentos:
        membros.length >= SEGMENTOS.length
          ? (Object.fromEntries(SEGMENTOS.map((s, i) => [s, segmentoDe(membros[i])])) as Record<NomeSegmento, SegmentoCorpo>)
          : null,
      registradoEm,
    });
  }
  return { registros, ignoradas };
}
