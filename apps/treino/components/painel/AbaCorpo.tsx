import { LinhaSerie } from "@/components/painel/graficos/LinhaSerie";
import type { Intervalo, MedicaoCorpo } from "@/lib/painel/intervalos";
import { Cartao } from "./Cartao";

const fmt = (v: number | null, un = "", sinal = false) =>
  v === null ? "—" : `${sinal && v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}${un ? ` ${un}` : ""}`;

export function AbaCorpo({ corpo, intervalos }: { corpo: MedicaoCorpo[]; intervalos: Intervalo[] }) {
  const serie = (f: (m: MedicaoCorpo) => number | null) => corpo.flatMap((m) => (f(m) === null ? [] : [{ data: m.data, valor: f(m) as number }]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Cartao titulo="Peso corporal">
          <LinhaSerie pontos={serie((m) => m.pesoKg)} rotulo="Peso" unidade="kg" altura={170} />
        </Cartao>
        <Cartao titulo="Percentual de gordura">
          <LinhaSerie pontos={serie((m) => m.gorduraPct)} rotulo="Gordura" unidade="%" cor="danger" altura={170} />
        </Cartao>
        <Cartao titulo="Massa muscular e magra">
          <LinhaSerie pontos={serie((m) => m.massaMagraKg)} rotulo="Massa magra" unidade="kg" cor="accent" altura={170} />
        </Cartao>
      </div>
      <Cartao titulo="O que mudou entre cada avaliação física" sub="Como sua rotina de sono e treinos influenciou a mudança de peso e músculo em cada período">
        {intervalos.length === 0 ? (
          <p className="text-sm text-ink-muted">São necessárias pelo menos duas avaliações corporais para comparar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Período</th>
                  <th className="pr-3 font-medium">Peso</th>
                  <th className="pr-3 font-medium">Gordura</th>
                  <th className="pr-3 font-medium">Massa muscular</th>
                  <th className="pr-3 font-medium">Treinos / sem</th>
                  <th className="pr-3 font-medium">Séries / sem</th>
                  <th className="pr-3 font-medium">Sono médio</th>
                  <th className="pr-3 font-medium">Batimentos repouso</th>
                  <th className="font-medium">Recuperação (VFC)</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {intervalos.map((i) => (
                  <tr key={i.de + i.ate} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-ink-muted">
                      {i.de.slice(5)} → {i.ate.slice(5)} ({i.dias} dias)
                    </td>
                    <td className="pr-3">{fmt(i.delta.pesoKg, "kg", true)}</td>
                    <td className="pr-3">{fmt(i.delta.gorduraPp, "%", true)}</td>
                    <td className="pr-3">{fmt(i.delta.massaMagraKg, "kg", true)}</td>
                    <td className="pr-3">{i.treino.treinosPorSemana}</td>
                    <td className="pr-3">{i.treino.seriesPorSemana}</td>
                    <td className="pr-3">{fmt(i.garmin?.sonoHoras ?? null, "h")}</td>
                    <td className="pr-3">{fmt(i.garmin?.fcRepouso ?? null, "bpm")}</td>
                    <td>{fmt(i.garmin?.hrvMs ?? null, "ms")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              “—” indica período antes do início da coleta pelo relógio. Dica: os números de bioimpedância sofrem influência da quantidade de água ingerida e do horário da pesagem. O mais importante é acompanhar a evolução geral ao longo dos meses.
            </p>
          </div>
        )}
      </Cartao>
    </div>
  );
}
