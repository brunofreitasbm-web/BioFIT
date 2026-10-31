// Medidor semicircular 0–100. A cor segue a recomendação, mas o número e o texto também
// aparecem: a cor nunca é o único canal de informação.

const COR = (v: number) => (v >= 75 ? "stroke-accent" : v >= 55 ? "stroke-brand" : v >= 35 ? "stroke-grupo-deltoides" : "stroke-danger");

export function Gauge({ valor, rotulo, sub }: { valor: number | null; rotulo: string; sub?: string }) {
  const R = 70;
  const C = Math.PI * R; // comprimento do semicírculo
  const v = valor === null ? 0 : Math.min(100, Math.max(0, valor));
  const arco = `M ${90 - R} 90 A ${R} ${R} 0 0 1 ${90 + R} 90`;
  return (
    <figure className="mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 180 104" className="h-auto w-full" role="img" aria-label={`${rotulo}: ${valor ?? "sem dados"} de 100`}>
        <path d={arco} fill="none" className="stroke-base-600" strokeWidth={12} strokeLinecap="round" />
        {valor !== null && (
          <path d={arco} fill="none" className={COR(v)} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${(v / 100) * C} ${C}`} />
        )}
        <text x={90} y={78} textAnchor="middle" className="fill-ink font-display" fontSize={40} fontWeight={700}>
          {valor ?? "—"}
        </text>
        <text x={90} y={98} textAnchor="middle" className="fill-ink-muted" fontSize={11}>
          {rotulo}
        </text>
      </svg>
      {sub && <figcaption className="mt-1 text-center text-xs text-ink-muted">{sub}</figcaption>}
    </figure>
  );
}
