import { LinhaSerie } from "@/components/graficos/LinhaSerie";
import type { Intervalo, MedicaoCorpo } from "@/lib/recuperacao/intervalos";
import { Cartao } from "./Cartao";

const fmt = (v: number | null, un = "", sinal = false) =>
  v === null ? "—" : `${sinal && v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}${un ? ` ${un}` : ""}`;

export function AbaCorpo({ corpo, intervalos }: { corpo: MedicaoCorpo[]; intervalos: Intervalo[] }) {
  const serie = (f: (m: MedicaoCorpo) => number | null) => corpo.flatMap((m) => (f(m) === null ? [] : [{ data: m.data, valor: f(m) as number }]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Cartao titulo="Peso">
          <LinhaSerie pontos={serie((m) => m.pesoKg)} rotulo="Peso" unidade="kg" altura={170} />
        </Cartao>
        <Cartao titulo="Gordura corporal">
          <LinhaSerie pontos={serie((m) => m.gorduraPct)} rotulo="Gordura" unidade="%" cor="danger" altura={170} />
        </Cartao>
        <Cartao titulo="Massa magra">
          <LinhaSerie pontos={serie((m) => m.massaMagraKg)} rotulo="Massa magra" unidade="kg" cor="accent" altura={170} />
        </Cartao>
      </div>
      <Cartao titulo="O que aconteceu entre cada medição" sub="Treino e recuperação média em cada intervalo, ao lado da variação do corpo">
        {intervalos.length === 0 ? (
          <p className="text-sm text-ink-muted">Precisa de pelo menos duas bioimpedâncias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Intervalo</th>
                  <th className="pr-3 font-medium">Peso</th>
                  <th className="pr-3 font-medium">Gordura</th>
                  <th className="pr-3 font-medium">Massa magra</th>
                  <th className="pr-3 font-medium">Treinos/sem</th>
                  <th className="pr-3 font-medium">Séries/sem</th>
                  <th className="pr-3 font-medium">Sono (h)</th>
                  <th className="pr-3 font-medium">FC rep.</th>
                  <th className="font-medium">VFC</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {intervalos.map((i) => (
                  <tr key={i.de + i.ate} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-ink-muted">
                      {i.de.slice(5)} → {i.ate.slice(5)} ({i.dias} d)
                    </td>
                    <td className="pr-3">{fmt(i.delta.pesoKg, "kg", true)}</td>
                    <td className="pr-3">{fmt(i.delta.gorduraPp, "p.p.", true)}</td>
                    <td className="pr-3">{fmt(i.delta.massaMagraKg, "kg", true)}</td>
                    <td className="pr-3">{i.treino.treinosPorSemana}</td>
                    <td className="pr-3">{i.treino.seriesPorSemana}</td>
                    <td className="pr-3">{fmt(i.garmin?.sonoHoras ?? null)}</td>
                    <td className="pr-3">{fmt(i.garmin?.fcRepouso ?? null)}</td>
                    <td>{fmt(i.garmin?.hrvMs ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              “—” indica intervalo anterior ao início da coleta Garmin. Bioimpedância mistura hidratação e hora do dia com mudança real: leia tendência, não um ponto.
            </p>
          </div>
        )}
      </Cartao>
    </div>
  );
}
