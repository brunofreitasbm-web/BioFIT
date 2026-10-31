import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { lerGarminSupabase, montarRespostaGarmin, type DadosGarminBrutos } from "@/lib/servidor/garmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fallback de desenvolvimento: JSON gerado por biofit_garmin_sync.py (gitignored, não vai à Vercel).
function lerJsonLocal(): DadosGarminBrutos | null {
  const filePath = path.join(process.cwd(), "public", "garmin-data.json");
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(data?.diario)) return null;
  return { diario: data.diario, treinos: Array.isArray(data?.treinos) ? data.treinos : [], intraday: [] };
}

export async function GET() {
  try {
    let brutos: DadosGarminBrutos | null = null;
    try {
      brutos = await lerGarminSupabase(90);
    } catch (e) {
      // RPC ainda não aplicada (migration 0004) ou Supabase fora: tenta o arquivo local.
      console.warn("[Garmin] Supabase indisponível, usando JSON local:", (e as Error).message);
    }
    if (!brutos || brutos.diario.length === 0) brutos = lerJsonLocal();

    const resposta = brutos ? montarRespostaGarmin(brutos) : null;
    if (!resposta) {
      return NextResponse.json({
        disponivel: false,
        mensagem: "Nenhum dado do Garmin sincronizado ainda. Execute a sincronização.",
        biometria: null,
      });
    }
    return NextResponse.json(resposta);
  } catch (error) {
    console.error("[Erro na rota Garmin]:", error);
    return NextResponse.json({ disponivel: false, erro: "Falha ao carregar dados do Garmin" }, { status: 500 });
  }
}
