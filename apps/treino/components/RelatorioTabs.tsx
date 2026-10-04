import Link from "next/link";

const ABAS = [
  { href: "/relatorio", label: "Visão Geral" },
  { href: "/relatorio/frequencia", label: "Frequência" },
  { href: "/relatorio/exercicios", label: "Exercícios" },
] as const;

// Alternador entre as sub-páginas do Relatório.
export function RelatorioTabs({ ativa }: { ativa: (typeof ABAS)[number]["href"] }) {
  return (
    <div className="flex gap-1.5 rounded-full border border-line bg-base-800 p-1 text-xs font-medium">
      {ABAS.map((aba) =>
        aba.href === ativa ? (
          <span key={aba.href} className="flex-1 rounded-full bg-brand py-1.5 text-center text-brand-ink shadow-sm">
            {aba.label}
          </span>
        ) : (
          <Link key={aba.href} href={aba.href} className="flex-1 rounded-full py-1.5 text-center text-ink-muted hover:text-ink">
            {aba.label}
          </Link>
        ),
      )}
    </div>
  );
}
