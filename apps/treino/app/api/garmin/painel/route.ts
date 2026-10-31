import { NextResponse } from "next/server";
import { lerGarminPainel, montarPainelGarmin } from "@/lib/servidor/garminPainel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_PADRAO = 120;
const DIAS_MAX = 400;

// Todas as séries Garmin para o painel desktop: um dia por linha, com fases do sono, prontidão,
// carga etc., mais as atividades e as curvas intradia. ?dias=N (padrão 120, máx. 400).
export async function GET(req: Request) {
  try {
    const pedido = Number(new URL(req.url).searchParams.get("dias"));
    const dias = Number.isInteger(pedido) && pedido > 0 ? Math.min(pedido, DIAS_MAX) : DIAS_PADRAO;

    const brutos = await lerGarminPainel(dias);
    if (!brutos || brutos.diario.length === 0) return NextResponse.json({ disponivel: false, painel: null });

    return NextResponse.json({ disponivel: true, painel: montarPainelGarmin(brutos) });
  } catch (error) {
    console.error("[Erro na rota Garmin painel]:", error);
    return NextResponse.json({ disponivel: false, erro: "Falha ao carregar dados do Garmin" }, { status: 500 });
  }
}
