import { Dispersao } from "@/components/painel/graficos/Dispersao";
import type { DadosPainel } from "@/lib/painel/dados";
import { Cartao, SeloConfianca } from "./Cartao";

export function AbaCruzamentos({ d }: { d: DadosPainel }) {
  const diasComDados = d.painel.dias.length;
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-line bg-base-800 p-3 text-xs text-ink-muted">
        O sistema analisa como seu sono, seus treinos e sua rotina conversam entre si. Com {diasComDados} dias de dados registrados,
        os primeiros padrões começam a aparecer. Quanto mais semanas de uso contínuo, mais confiáveis e personalizadas ficam as descobertas.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {d.insights.map((i) => (
          <Cartao key={i.id} titulo={i.titulo}>
            <p className="text-sm text-ink">{i.resumo}</p>
            {i.detalhe && <p className="mt-1 text-xs text-ink-faint">{i.detalhe}</p>}
            {i.pontos && i.pontos.length > 0 && i.rotuloX && i.rotuloY && (
              <div className="mt-3">
                <Dispersao pontos={i.pontos} rotuloX={i.rotuloX} rotuloY={i.rotuloY} />
              </div>
            )}
            <div className="mt-3">
              <SeloConfianca nivel={i.confianca} n={i.n} />
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
