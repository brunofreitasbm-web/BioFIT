import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "garmin-data.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        disponivel: false,
        mensagem: "Nenhum dado do Garmin sincronizado ainda. Execute a sincronização.",
        biometria: null,
      });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    const diario = data?.diario;
    if (!Array.isArray(diario) || diario.length === 0) {
      return NextResponse.json({
        disponivel: false,
        biometria: null,
      });
    }

    // Pega o registro mais recente (geralmente o primeiro ou último da lista ordenada)
    // Ordena decrescente por data
    const ordenado = [...diario].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    const maisRecente = ordenado[0];

    const sonoMin = maisRecente.sono_minutos;
    const sonoHoras = typeof sonoMin === "number" ? Math.round((sonoMin / 60) * 10) / 10 : null;

    const biometria = {
      data: maisRecente.data,
      bodyBattery: maisRecente.body_battery_acordar ?? maisRecente.body_battery_max ?? null,
      sonoMinutos: sonoMin ?? null,
      sonoHoras,
      sonoScore: maisRecente.sono_score ?? null,
      hrvStatus: maisRecente.vfc_status ?? null,
      hrvMs: maisRecente.vfc_noturna_ms ?? null,
      stress: maisRecente.estresse_medio ?? null,
      fcRepouso: maisRecente.fc_repouso_bpm ?? null,
      passos: maisRecente.passos ?? null,
    };

    return NextResponse.json({
      disponivel: true,
      biometria,
    });
  } catch (error) {
    console.error("[Erro na rota Garmin]:", error);
    return NextResponse.json(
      { disponivel: false, erro: "Falha ao carregar dados do Garmin" },
      { status: 500 },
    );
  }
}
