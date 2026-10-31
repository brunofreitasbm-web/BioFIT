import { NextResponse } from "next/server";
import { lerGarmin } from "@/lib/servidor/garmin";
import { avaliarVfc } from "@/lib/prontidao";
import { resumirRecuperacao } from "@/lib/servidor/garminPainel";

export const runtime = "nodejs";
// Sem isso o Next pré-renderiza a resposta no build e o cartão fica congelado até o próximo deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await lerGarmin();
    if (!data) {
      return NextResponse.json({
        disponivel: false,
        mensagem: "Nenhum dado do Garmin sincronizado ainda. Execute a sincronização.",
        biometria: null,
      });
    }

    const diario = data.diario;
    if (diario.length === 0) {
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

    // Janela dos últimos 30 dias (mais antigo primeiro) para o Coach cruzar com a bioimpedância.
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const janela = {
      diario: ordenado
        .slice(0, 30)
        .reverse()
        .map((d) => ({
          data: d.data,
          sonoHoras: num(d.sono_minutos) !== null ? Math.round((d.sono_minutos / 60) * 10) / 10 : null,
          sonoScore: num(d.sono_score),
          hrvMs: num(d.vfc_noturna_ms),
          fcRepouso: num(d.fc_repouso_bpm),
          passos: num(d.passos),
          estresse: num(d.estresse_medio),
          bodyBattery: num(d.body_battery_acordar ?? d.body_battery_max),
        })),
      treinos: data.treinos
        .slice(0, 30)
        .map((t: Record<string, unknown>) => ({
          data: typeof t.biofit_sessao_data === "string" ? t.biofit_sessao_data : String(t.inicio_utc ?? "").slice(0, 10),
          tipo: String(t.tipo ?? ""),
          duracaoMin: num(t.duracao_s) !== null ? Math.round((t.duracao_s as number) / 60) : null,
          fcMedia: num(t.fc_media) !== null ? Math.round(t.fc_media as number) : null,
          calorias: num(t.calorias),
        })),
    };

    // A base da VFC precisa de ~5 semanas: avalia sobre tudo o que foi lido, não só a janela de 30 dias.
    const vfc = avaliarVfc(
      ordenado.map((d) => ({ data: String(d.data), hrvMs: num(d.vfc_noturna_ms), vfcStatus: typeof d.vfc_status === "string" ? d.vfc_status : null })),
      maisRecente.data,
    );

    return NextResponse.json({
      disponivel: true,
      biometria,
      janela: { ...janela, recuperacao: resumirRecuperacao({ diario: data.diario, treinos: data.treinos, intraday: [] }) },
      vfc,
    });
  } catch (error) {
    console.error("[Erro na rota Garmin]:", error);
    return NextResponse.json(
      { disponivel: false, erro: "Falha ao carregar dados do Garmin" },
      { status: 500 },
    );
  }
}
