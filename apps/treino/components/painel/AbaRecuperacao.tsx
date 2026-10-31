import { LinhaSerie } from "@/components/painel/graficos/LinhaSerie";
import { BarrasEmpilhadas } from "@/components/painel/graficos/BarrasEmpilhadas";
import { ehNum } from "@/lib/painel/estatistica";
import type { DiaRecuperacao } from "@/lib/painel/tipos";
import { Cartao } from "./Cartao";

// Série de um campo numérico, descartando dias sem valor.
function serie(dias: DiaRecuperacao[], f: (d: DiaRecuperacao) => number | null) {
  return dias.flatMap((d) => {
    const v = f(d);
    return ehNum(v) ? [{ data: d.data, valor: v }] : [];
  });
}

export function AbaRecuperacao({ dias }: { dias: DiaRecuperacao[] }) {
  const temFases = dias.some((d) => ehNum(d.sonoProfundoMin));
  const banda = dias.flatMap((d) => (ehNum(d.hrvBaseBaixo) && ehNum(d.hrvBaseAlto) ? [{ data: d.data, baixo: d.hrvBaseBaixo, alto: d.hrvBaseAlto }] : []));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Cartao titulo="VFC noturna" sub={banda.length ? "Faixa cinza = seu normal (Garmin)" : undefined}>
        <LinhaSerie pontos={serie(dias, (d) => d.hrvMs)} banda={banda} rotulo="VFC" unidade="ms" cor="accent" />
      </Cartao>
      <Cartao titulo="FC de repouso" sub="Subida de 3+ bpm sobre o normal costuma indicar cansaço ou doença">
        <LinhaSerie pontos={serie(dias, (d) => d.fcRepouso)} rotulo="FC de repouso" unidade="bpm" cor="danger" />
      </Cartao>
      <Cartao titulo="Sono por fase" sub={temFases ? "Minutos por noite" : "Fases do sono só existem nos dias sincronizados após a coleta ampliada"}>
        <BarrasEmpilhadas
          rotulo="Sono"
          unidade="min"
          barras={dias
            .filter((d) => ehNum(d.sonoProfundoMin))
            .map((d) => ({
              chave: d.data,
              segmentos: [
                { rotulo: "Profundo", valor: d.sonoProfundoMin ?? 0, classe: "fill-brand" },
                { rotulo: "REM", valor: d.sonoRemMin ?? 0, classe: "fill-accent" },
                { rotulo: "Leve", valor: d.sonoLeveMin ?? 0, classe: "fill-base-500" },
                { rotulo: "Acordado", valor: d.sonoAcordadoMin ?? 0, classe: "fill-danger" },
              ],
            }))}
        />
      </Cartao>
      <Cartao titulo="Body Battery ao acordar" sub="Quanto da bateria o sono recarregou">
        <LinhaSerie pontos={serie(dias, (d) => d.bodyBatteryAcordar)} rotulo="Body Battery" unidade="" faixaIdeal={{ de: 70, ate: 100 }} />
      </Cartao>
      <Cartao titulo="Respiração noturna" sub="Alta fora do padrão, com FC alta, é o sinal mais precoce de doença">
        <LinhaSerie pontos={serie(dias, (d) => d.respiracao)} rotulo="Respiração" unidade="rpm" />
      </Cartao>
      <Cartao titulo="Estresse médio do dia">
        <LinhaSerie pontos={serie(dias, (d) => d.estresse)} rotulo="Estresse" unidade="" cor="danger" />
      </Cartao>
      <Cartao titulo="Passos por dia">
        <LinhaSerie pontos={serie(dias, (d) => d.passos)} rotulo="Passos" unidade="" cor="brand" />
      </Cartao>
    </div>
  );
}
