import { LinhaSerie } from "@/components/graficos/LinhaSerie";
import { BarrasEmpilhadas } from "@/components/graficos/BarrasEmpilhadas";
import { HeatmapAnual } from "@/components/HeatmapAnual";
import { resumoCarga } from "@/lib/recuperacao/carga";
import { ehNum, diaDaSemana, somarDiasIso } from "@/lib/recuperacao/estatistica";
import type { DadosPainel } from "@/lib/recuperacao/painel";
import { Cartao, Metrica } from "./Cartao";

const ZONA_TEXTO = { baixa: "abaixo do ideal (destreino)", ideal: "na faixa ideal", alta: "alta", "muito-alta": "muito alta (risco de sobrecarga)" } as const;

// Segunda-feira da semana de `iso`.
function segunda(iso: string): string {
  const dow = diaDaSemana(iso);
  return somarDiasIso(iso, -((dow + 6) % 7));
}

export function AbaCarga({ d }: { d: DadosPainel }) {
  const r = d.resumo;
  const acwr = d.carga.flatMap((c) => {
    const x = resumoCarga(d.carga, c.data);
    return x && ehNum(x.acwr) && x.confiavel ? [{ data: c.data, valor: x.acwr }] : [];
  });
  const ultimos28 = d.carga.slice(-28);

  const semanas = new Map<string, number[]>();
  for (const t of d.painel.treinos) {
    if (!t.zonasFcS) continue;
    const k = segunda(t.data);
    const z = semanas.get(k) ?? [0, 0, 0, 0, 0];
    t.zonasFcS.forEach((s, i) => (z[i] += s / 60));
    semanas.set(k, z);
  }
  const CLASSES = ["fill-base-500", "fill-grupo-costas", "fill-accent", "fill-brand", "fill-danger"];

  const garminAguda = d.painel.dias.flatMap((x) => (ehNum(x.cargaAguda) ? [{ data: x.data, valor: x.cargaAguda }] : []));
  const garminCronica = d.painel.dias.flatMap((x) => (ehNum(x.cargaCronica) ? [{ data: x.data, valor: x.cargaCronica }] : []));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metrica rotulo="Carga aguda (7 d)" valor={r ? String(r.aguda) : "—"} sub="média diária" />
        <Metrica rotulo="Carga crônica (28 d)" valor={r ? String(r.cronica) : "—"} sub="média diária" />
        <Metrica rotulo="ACWR" valor={r?.acwr != null ? String(r.acwr) : "—"} sub={r?.zona ? ZONA_TEXTO[r.zona] : "sem histórico suficiente"} />
        <Metrica rotulo="Monotonia / strain" valor={r?.monotonia != null ? String(r.monotonia) : "—"} sub={r?.strain != null ? `strain ${r.strain}` : undefined} />
      </div>
      {r && !r.confiavel && (
        <p className="rounded-lg border border-brand/40 bg-brand-soft p-3 text-xs text-ink-muted">
          Menos de 21 dias de histórico: o ACWR ainda não é confiável. O gráfico só mostra dias a partir desse limite.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Cartao titulo="ACWR (aguda ÷ crônica)" sub="Faixa verde 0,8–1,3 = progressão segura">
          <LinhaSerie pontos={acwr} rotulo="ACWR" unidade="" faixaIdeal={{ de: 0.8, ate: 1.3 }} linhaRef={[{ valor: 1.5, rotulo: "risco" }]} />
        </Cartao>
        <Cartao titulo="Carga diária" sub="TRIMP do relógio + séries de força × 3 (últimos 28 dias)">
          <BarrasEmpilhadas
            rotulo="Carga"
            unidade="UA"
            barras={ultimos28.map((c) => ({
              chave: c.data,
              segmentos: [
                { rotulo: "Cardio (TRIMP)", valor: c.trimp, classe: "fill-accent" },
                { rotulo: "Força (séries)", valor: c.forca, classe: "fill-brand" },
              ],
            }))}
          />
        </Cartao>
        <Cartao titulo="Tempo em zonas de FC por semana" sub={semanas.size ? "Minutos por semana, Z1 a Z5" : "Zonas só chegam nos treinos sincronizados após a coleta ampliada"}>
          <BarrasEmpilhadas
            rotulo="Zonas de FC"
            unidade="min"
            ehData
            barras={[...semanas.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([chave, z]) => ({ chave, segmentos: z.map((v, i) => ({ rotulo: `Z${i + 1}`, valor: Math.round(v), classe: CLASSES[i] })) }))}
          />
        </Cartao>
        <Cartao titulo="Carga calculada pela Garmin" sub="Aguda (7 d) e crônica (28 d) do relógio, para comparar com a sua">
          <LinhaSerie pontos={garminAguda} rotulo="Carga aguda Garmin" unidade="" cor="brand" />
          <LinhaSerie pontos={garminCronica} rotulo="Carga crônica Garmin" unidade="" cor="accent" altura={150} />
        </Cartao>
      </div>
      <Cartao titulo="Frequência de treino no ano" sub="Dias com séries de força registradas">
        <HeatmapAnual />
      </Cartao>
    </div>
  );
}
