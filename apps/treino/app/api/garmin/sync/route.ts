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
// Recuperação de histórico: `?dias=N` (1 a 35) busca os últimos N dias em vez de 2. Só com o
// segredo (o cron não manda parâmetro). Seguro repetir: o merge não apaga nem duplica.
const DIAS_PADRAO = 2;
const DIAS_MAX = 35;
const DIAS_EM_PARALELO = 3; // 3 dias x 5 chamadas: não martela a API da Garmin

function lerDias(req: Request): number | null {
  const bruto = new URL(req.url).searchParams.get("dias");
  if (bruto === null) return DIAS_PADRAO;
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 && n <= DIAS_MAX ? n : null;
}

export async function GET(req: Request) {
  if (!tokenValido(tokenDoHeader(req), process.env.CRON_SECRET)) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const quantos = lerDias(req);
  if (quantos === null) return NextResponse.json({ erro: `dias deve ser inteiro entre 1 e ${DIAS_MAX}` }, { status: 400 });
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

  const hoje = hojeBelem();
  const dias = Array.from({ length: quantos }, (_, i) => somaDias(hoje, i - (quantos - 1))); // mais antigo primeiro
  const falhas: string[] = [];
  const formato: Record<string, string[]> = {};
  const lembrar = (nome: string, v: unknown) => {
    if (!formato[nome] && v !== null && v !== undefined) formato[nome] = estrutura(v);
  };
  const tentar = async (nome: string, caminho: string): Promise<unknown> => {
    try {
      const r = await buscar(caminho, token);
      lembrar(nome, r);
      return r;
    } catch (e) {
      falhas.push(e instanceof ErroGarmin ? e.message : `${nome}: erro de rede`);
      return null;
    }
  };

  const diario: LinhaDiario[] = [];
  const buscarDia = async (dia: string): Promise<LinhaDiario | null> => {
    const [sono, hrv, resumo, bodyBattery, passos] = await Promise.all([
      tentar("sono", caminhos.sono(dia)),
      tentar("hrv", caminhos.hrv(dia)),
      tentar("resumo", caminhos.resumo(dia)),
      tentar("bodyBattery", caminhos.bodyBattery(dia)),
      tentar("passos", caminhos.passos(dia)),
    ]);
    const respostas: RespostasDia = { sono, hrv, resumo, bodyBattery, passos };
    return converterDia(dia, respostas);
  };
  for (let i = 0; i < dias.length; i += DIAS_EM_PARALELO) {
    for (const linha of await Promise.all(dias.slice(i, i + DIAS_EM_PARALELO).map(buscarDia))) if (linha) diario.push(linha);
  }
  const treinos = converterAtividades(await tentar("atividades", caminhos.atividades(dias[0], hoje, Math.min(200, Math.max(30, quantos * 3)))));

  console.log("[garmin sync]", JSON.stringify({ diario: diario.length, treinos: treinos.length, falhas, formato }));

  if (diario.length === 0 && treinos.length === 0) {
    return NextResponse.json({ ok: false, diario: 0, treinos: 0, falhas, formato }, { status: falhas.length ? 502 : 200 });
  }
  try {
    // `formato` = só nomes de campos (sem valores): a resposta já exige o segredo e o log da Vercel trunca.
    return NextResponse.json({ ok: true, dias: quantos, ...(await gravarGarmin({ diario, treinos })), falhas, formato });
  } catch (e) {
    console.error("[garmin sync] falha ao gravar:", e);
    return NextResponse.json({ erro: "falha_ao_gravar", falhas }, { status: 502 });
  }
}
