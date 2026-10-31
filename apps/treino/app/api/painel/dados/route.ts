import { NextResponse } from "next/server";
import { lerGarminPainel, montarPainelGarmin } from "@/lib/painel/servidor/garminPainel";
import { supabaseConfigurado } from "@/lib/servidor/garmin";
import { lerTreino, type DadosTreino } from "@/lib/painel/servidor/treino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_PADRAO = 400;

// Tudo o que o painel desenha: Garmin (todas as séries), séries de força e bioimpedância.
// Se o backup do app de treino falhar, o painel segue só com o Garmin (e avisa).
export async function GET() {
  if (!supabaseConfigurado()) {
    return NextResponse.json({ disponivel: false, motivo: "Defina SUPABASE_URL, SUPABASE_ANON_KEY e BIOFIT_DB_SECRET." });
  }
  try {
    const brutos = await lerGarminPainel(DIAS_PADRAO);
    if (!brutos || brutos.diario.length === 0) return NextResponse.json({ disponivel: false, motivo: "Nenhum dado Garmin sincronizado ainda." });

    let treino: DadosTreino = { forca: [], corpo: [] };
    const avisos: string[] = [];
    try {
      treino = await lerTreino();
    } catch (e) {
      console.warn("[painel] backup do treino indisponível:", (e as Error).message);
      avisos.push("Séries de força e bioimpedância indisponíveis agora; mostrando só o Garmin.");
    }
    return NextResponse.json({ disponivel: true, garmin: montarPainelGarmin(brutos), forca: treino.forca, corpo: treino.corpo, avisos });
  } catch (error) {
    console.error("[painel] erro:", error);
    return NextResponse.json({ disponivel: false, motivo: "Falha ao carregar os dados." }, { status: 500 });
  }
}
