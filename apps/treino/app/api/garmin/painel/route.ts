import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { lerGarminSupabase, montarPainelGarmin, type DadosGarminBrutos } from "@/lib/servidor/garmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_PADRAO = 120;
const DIAS_MAX = 400;

function lerJsonLocal(): DadosGarminBrutos | null {
  const filePath = path.join(process.cwd(), "public", "garmin-data.json");
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(data?.diario)) return null;
  return { diario: data.diario, treinos: Array.isArray(data?.treinos) ? data.treinos : [], intraday: [] };
}

// Todas as séries Garmin para o painel desktop: um dia por linha, com fases do sono, prontidão,
// carga etc., mais as atividades e as curvas intradia. ?dias=N (padrão 120, máx. 400).
export async function GET(req: Request) {
  try {
    const pedido = Number(new URL(req.url).searchParams.get("dias"));
    const dias = Number.isInteger(pedido) && pedido > 0 ? Math.min(pedido, DIAS_MAX) : DIAS_PADRAO;

    let brutos: DadosGarminBrutos | null = null;
    try {
      brutos = await lerGarminSupabase(dias);
    } catch (e) {
      console.warn("[Garmin painel] Supabase indisponível, usando JSON local:", (e as Error).message);
    }
    if (!brutos || brutos.diario.length === 0) brutos = lerJsonLocal();
    if (!brutos) return NextResponse.json({ disponivel: false, painel: null });

    return NextResponse.json({ disponivel: true, painel: montarPainelGarmin(brutos) });
  } catch (error) {
    console.error("[Erro na rota Garmin painel]:", error);
    return NextResponse.json({ disponivel: false, erro: "Falha ao carregar dados do Garmin" }, { status: 500 });
  }
}
