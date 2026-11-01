import { LinhaSerie } from "@/components/painel/graficos/LinhaSerie";
import { BarrasEmpilhadas } from "@/components/painel/graficos/BarrasEmpilhadas";
import { resumoCarga } from "@/lib/painel/carga";
import { ehNum, diaDaSemana, somarDiasIso } from "@/lib/painel/estatistica";
import type { DadosPainel } from "@/lib/painel/dados";
import { Cartao, Metrica } from "./Cartao";

const ZONA_TEXTO = {
  baixa: "Abaixo do habitual (perigo de perda de ritmo)",
  ideal: "Ritmo equilibrado e seguro",
  alta: "Esforço alto (acima do habitual)",
  "muito-alta": "Esforço excessivo (cuidado com sobrecarga e lesão)",
} as const;

const NOMES_ZONAS = [
  "Z1 (Leve / Aquecimento)",
  "Z2 (Ritmo confortável)",
  "Z3 (Moderado)",
  "Z4 (Intenso)",
  "Z5 (Esforço máximo)",
];

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
  const CLASSES = ["fill-base-500", "fill-accent/50", "fill-accent", "fill-brand", "fill-danger"];

  const garminAguda = d.painel.dias.flatMap((x) => (ehNum(x.cargaAguda) ? [{ data: x.data, valor: x.cargaAguda }] : []));
  const garminCronica = d.painel.dias.flatMap((x) => (ehNum(x.cargaCronica) ? [{ data: x.data, valor: x.cargaCronica }] : []));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metrica rotulo="Esforço recente (7 dias)" valor={r ? String(r.aguda) : "—"} sub="Média diária recente" />
        <Metrica rotulo="Esforço habitual (28 dias)" valor={r ? String(r.cronica) : "—"} sub="Média diária do mês" />
        <Metrica rotulo="Equilíbrio de treino (ACWR)" valor={r?.acwr != null ? String(r.acwr) : "—"} sub={r?.zona ? ZONA_TEXTO[r.zona] : "Histórico insuficiente"} />
        <Metrica rotulo="Variação e desgaste" valor={r?.monotonia != null ? String(r.monotonia) : "—"} sub={r?.strain != null ? `Índice de desgaste: ${r.strain}` : "Distribuição do esforço"} />
      </div>
      {r && !r.confiavel && (
        <p className="rounded-lg border border-brand/40 bg-brand-soft p-3 text-xs text-ink-muted">
          Menos de 21 dias de dados registrados: o índice de equilíbrio (ACWR) ainda está sendo calibrado contra o seu padrão.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Cartao titulo="Termômetro de sobrecarga (ACWR)" sub="Relação entre o esforço desta semana e a média do mês. Faixa verde (0,8 a 1,3) = evolução segura. Acima de 1,5 = alerta de fadiga.">
          <LinhaSerie pontos={acwr} rotulo="Equilíbrio (ACWR)" unidade="" faixaIdeal={{ de: 0.8, ate: 1.3 }} linhaRef={[{ valor: 1.5, rotulo: "Alerta de fadiga" }]} />
        </Cartao>
        <Cartao titulo="Esforço diário acumulado" sub="Pontos de esforço do exercício aeróbico no relógio + esforço da musculação (últimos 28 dias)">
          <BarrasEmpilhadas
            rotulo="Esforço"
            unidade="pts"
            barras={ultimos28.map((c) => ({
              chave: c.data,
              segmentos: [
                { rotulo: "Aeróbico / Cardio", valor: c.trimp, classe: "fill-accent" },
                { rotulo: "Musculação (Força)", valor: c.forca, classe: "fill-brand" },
              ],
            }))}
          />
        </Cartao>
        <Cartao titulo="Tempo em zonas de esforço cardíaco por semana" sub={semanas.size ? "Minutos por semana divididos por intensidade cardíaca (Z1 mais leve a Z5 máxima)" : "Zonas cardíacas detalhadas começam a aparecer nos treinos recentes"}>
          <BarrasEmpilhadas
            rotulo="Intensidade cardíaca"
            unidade="min"
            ehData
            barras={[...semanas.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([chave, z]) => ({ chave, segmentos: z.map((v, i) => ({ rotulo: NOMES_ZONAS[i] ?? `Z${i + 1}`, valor: Math.round(v), classe: CLASSES[i] })) }))}
          />
        </Cartao>
        <Cartao titulo="Estimativa de esforço do próprio relógio Garmin" sub="Cálculo automático do relógio: esforço da semana (recente) vs esforço do mês (habitual)">
          <LinhaSerie pontos={garminAguda} rotulo="Esforço recente Garmin (7d)" unidade="" cor="brand" />
          <LinhaSerie pontos={garminCronica} rotulo="Esforço habitual Garmin (28d)" unidade="" cor="accent" altura={150} />
        </Cartao>
      </div>
    </div>
  );
}
