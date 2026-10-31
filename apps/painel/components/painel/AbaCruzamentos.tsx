import { Dispersao } from "@/components/graficos/Dispersao";
import type { DadosPainel } from "@/lib/recuperacao/painel";
import { Cartao, SeloConfianca } from "./Cartao";

export function AbaCruzamentos({ d }: { d: DadosPainel }) {
  const diasComDados = d.painel.dias.length;
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-line bg-base-800 p-3 text-xs text-ink-muted">
        Cada leitura mostra quantos pares de dados a sustentam. Com {diasComDados} dias de Garmin, a maioria ainda é indício, não conclusão: correlação não prova causa e só ganha
        peso com semanas de repetição.
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
