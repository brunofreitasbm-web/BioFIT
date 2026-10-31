import { NextResponse } from "next/server";
import { tokenDoHeader, tokenValido } from "@/lib/servidor/backup";
import { gravarGarmin, supabaseConfigurado } from "@/lib/servidor/garmin";
import { buscar, caminhos, converterAtividades, converterDia, ErroGarmin, estrutura, obterToken, type RespostasDia } from "@/lib/servidor/garminPersonal";
import { hojeBelem, somaDias } from "@/lib/servidor/ferramentas/comum";
import type { LinhaDiario } from "@/lib/servidor/garminHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sync diário com a Garmin Connect Personal API, disparado pelo Vercel Cron (vercel.json), que
// envia `Authorization: Bearer $CRON_SECRET`. Busca ontem e hoje (o sono é datado pelo dia em
// que se acorda; o dia anterior só fecha passos/Body Battery depois da meia-noite) e grava pelo
// mesmo merge do banco (biofit_garmin_put): nulo nunca apaga dado existente.
//
// Recuperação de histórico (só com o segredo; o cron não manda parâmetro):
//   ?dias=N      últimos N dias (1 a 35; padrão 2)
//   ?ate=AAAA-MM-DD  fim da janela (padrão hoje), para recuperar em pedaços: dias=14&ate=...
// A chave da Garmin tem limite de requisições (429). Com mais de 3 dias o resumo, os passos e o
// Body Battery vêm em UMA chamada de intervalo cada; só sono e VFC são por dia, em sequência e
// com pausa. Se o 429 persistir, a rota para de buscar, grava o que já tem e devolve `parcial`.
// Seguro repetir: o merge não apaga nem duplica.
const DIAS_PADRAO = 2;
const DIAS_MAX = 35;
const DIAS_POR_INTERVALO = 3; // acima disso, usa os endpoints de intervalo
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const dormir = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());
const pausa = () => dormir(Number(process.env.GARMIN_SYNC_PAUSA_MS ?? 300));

function lerDias(url: URL): number | null {
  const bruto = url.searchParams.get("dias");
  if (bruto === null) return DIAS_PADRAO;
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 && n <= DIAS_MAX ? n : null;
}

function lerFim(url: URL, hoje: string): string | null {
  const bruto = url.searchParams.get("ate");
  if (bruto === null) return hoje;
  if (!ISO.test(bruto) || Number.isNaN(Date.parse(`${bruto}T12:00:00Z`)) || bruto > hoje) return null;
  return bruto;
}

export async function GET(req: Request) {
  if (!tokenValido(tokenDoHeader(req), process.env.CRON_SECRET)) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const hoje = hojeBelem();
  const quantos = lerDias(url);
  if (quantos === null) return NextResponse.json({ erro: `dias deve ser inteiro entre 1 e ${DIAS_MAX}` }, { status: 400 });
  const fim = lerFim(url, hoje);
  if (fim === null) return NextResponse.json({ erro: "ate deve ser AAAA-MM-DD, existente e não futuro" }, { status: 400 });
  const chave = process.env.GARMIN_PERSONAL_API_KEY;
  if (!chave) return NextResponse.json({ erro: "sem_GARMIN_PERSONAL_API_KEY" }, { status: 503 });
  if (!supabaseConfigurado()) return NextResponse.json({ erro: "servidor_sem_supabase" }, { status: 503 });

  let token: string;
  try {
    token = await obterToken(chave);
  } catch (e) {
    console.error("[garmin sync]", (e as Error).message);
    return NextResponse.json({ erro: "token", detalhe: (e as Error).message }, { status: 502 });
  }

  const dias = Array.from({ length: quantos }, (_, i) => somaDias(fim, i - (quantos - 1))); // mais antigo primeiro
  const falhas = new Set<string>();
  const formato: Record<string, string[]> = {};
  let limitado = false; // 429 persistente: para de buscar o que for opcional
  const lembrar = (nome: string, v: unknown) => {
    if (!formato[nome] && v !== null && v !== undefined) formato[nome] = estrutura(v);
  };
  const tentar = async (nome: string, caminho: string): Promise<unknown> => {
    if (limitado) return null;
    try {
      const r = await buscar(caminho, token);
      lembrar(nome, r);
      return r;
    } catch (e) {
      if (e instanceof ErroGarmin && e.status === 429) limitado = true;
      falhas.add(e instanceof ErroGarmin ? e.message : `${nome}: erro de rede`);
      return null;
    }
  };

  const diario: LinhaDiario[] = [];
  let parouEm: string | null = null; // primeiro dia sem sono/VFC por causa do limite
  if (quantos <= DIAS_POR_INTERVALO) {
    for (const dia of dias) {
      const [sono, hrv, resumo, bodyBattery, passos] = await Promise.all([
        tentar("sono", caminhos.sono(dia)),
        tentar("hrv", caminhos.hrv(dia)),
        tentar("resumo", caminhos.resumo(dia)),
        tentar("bodyBattery", caminhos.bodyBattery(dia)),
        tentar("passos", caminhos.passos(dia)),
      ]);
      const linha = converterDia(dia, { sono, hrv, resumo, bodyBattery, passos });
      if (linha) diario.push(linha);
    }
  } else {
    const resumo = await tentar("resumo", caminhos.resumoIntervalo(dias[0], fim));
    await pausa();
    const passos = await tentar("passos", caminhos.passosIntervalo(dias[0], fim));
    await pausa();
    const bodyBattery = await tentar("bodyBattery", caminhos.bodyBatteryIntervalo(dias[0], fim));
    for (const dia of dias) {
      if (limitado && parouEm === null) parouEm = dia;
      await pausa();
      const sono = await tentar("sono", caminhos.sono(dia));
      await pausa();
      const hrv = await tentar("hrv", caminhos.hrv(dia));
      const respostas: RespostasDia = { sono, hrv, resumo, bodyBattery, passos, intervalo: true };
      const linha = converterDia(dia, respostas);
      if (linha) diario.push(linha);
    }
  }
  const treinos = converterAtividades(await tentar("atividades", caminhos.atividades(dias[0], fim, Math.min(200, Math.max(30, quantos * 3)))));

  const listaFalhas = [...falhas].slice(0, 20);
  console.log("[garmin sync]", JSON.stringify({ diario: diario.length, treinos: treinos.length, limitado, parouEm, falhas: listaFalhas, formato }));

  if (diario.length === 0 && treinos.length === 0) {
    return NextResponse.json({ ok: false, diario: 0, treinos: 0, parcial: limitado, falhas: listaFalhas, formato }, { status: falhas.size ? 502 : 200 });
  }
  try {
    // `formato` = só nomes de campos (sem valores): a resposta já exige o segredo e o log da Vercel trunca.
    return NextResponse.json({
      ok: true,
      dias: quantos,
      ate: fim,
      ...(await gravarGarmin({ diario, treinos })),
      parcial: limitado,
      ...(parouEm ? { semSonoEVfcAPartirDe: parouEm } : {}),
      falhas: listaFalhas,
      formato,
    });
  } catch (e) {
    console.error("[garmin sync] falha ao gravar:", e);
    return NextResponse.json({ erro: "falha_ao_gravar", falhas: listaFalhas }, { status: 502 });
  }
}
