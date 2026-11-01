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
      <Cartao
        titulo="Recuperação do coração durante o sono (VFC)"
        sub={banda.length ? "A VFC mede o descanso do corpo. A faixa cinza é o seu padrão normal do relógio." : "A VFC (variabilidade da frequência cardíaca) reflete o descanso do organismo."}
      >
        <LinhaSerie pontos={serie(dias, (d) => d.hrvMs)} banda={banda} rotulo="VFC" unidade="ms" cor="accent" />
      </Cartao>
      <Cartao
        titulo="Batimentos cardíacos em repouso"
        sub="Seus batimentos dormindo. Subir 3+ bpm acima do seu habitual costuma indicar cansaço acumulado ou início de resfriado."
      >
        <LinhaSerie pontos={serie(dias, (d) => d.fcRepouso)} rotulo="Batimentos de repouso" unidade="bpm" cor="danger" />
      </Cartao>
      <Cartao
        titulo="Fases do sono em cada noite"
        sub={temFases ? "Minutos dormidos por noite (fases profunda e REM são as que mais recuperam o corpo e a mente)." : "Fases do sono detalhadas estão disponíveis nas sincronizações recentes."}
      >
        <BarrasEmpilhadas
          rotulo="Tempo de sono"
          unidade="min"
          barras={dias
            .filter((d) => ehNum(d.sonoProfundoMin))
            .map((d) => ({
              chave: d.data,
              segmentos: [
                { rotulo: "Profundo (corpo)", valor: d.sonoProfundoMin ?? 0, classe: "fill-brand" },
                { rotulo: "REM (mente)", valor: d.sonoRemMin ?? 0, classe: "fill-accent" },
                { rotulo: "Leve", valor: d.sonoLeveMin ?? 0, classe: "fill-base-500" },
                { rotulo: "Acordado", valor: d.sonoAcordadoMin ?? 0, classe: "fill-danger" },
              ],
            }))}
        />
      </Cartao>
      <Cartao titulo="Bateria de energia ao acordar" sub="O quanto seu sono conseguiu recarregar a sua energia para o dia (ideal: 70 a 100)">
        <LinhaSerie pontos={serie(dias, (d) => d.bodyBatteryAcordar)} rotulo="Energia corporal" unidade="" faixaIdeal={{ de: 70, ate: 100 }} />
      </Cartao>
      <Cartao titulo="Ritmo de respiração no sono" sub="Respirações por minuto. Aumento fora do comum com batimentos altos é o primeiro sinal de estresse ou início de infecção.">
        <LinhaSerie pontos={serie(dias, (d) => d.respiracao)} rotulo="Respiração" unidade="rpm" />
      </Cartao>
      <Cartao titulo="Nível médio de estresse no dia" sub="Escala de 0 a 100: mede o quanto sua rotina exigiu do coração ao longo das 24 horas.">
        <LinhaSerie pontos={serie(dias, (d) => d.estresse)} rotulo="Estresse" unidade="" cor="danger" />
      </Cartao>
      <Cartao titulo="Passos e movimentação diária" sub="Total de passos registrados pelo relógio em cada dia.">
        <LinhaSerie pontos={serie(dias, (d) => d.passos)} rotulo="Passos" unidade="" cor="brand" />
      </Cartao>
    </div>
  );
}
