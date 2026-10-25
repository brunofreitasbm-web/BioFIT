import Link from "next/link";

const ABAS = [
  { href: "/isabela/relatorio", label: "Visão Geral" },
  { href: "/isabela/relatorio/frequencia", label: "Frequência" },
  { href: "/isabela/relatorio/exercicios", label: "Exercícios" },
] as const;

// Alternador entre as sub-páginas do Relatório.
export function RelatorioTabs({ ativa }: { ativa: (typeof ABAS)[number]["href"] }) {
  return (
    <div className="flex gap-1.5 rounded-full border border-line bg-base-800 p-1 text-sm font-medium">
      {ABAS.map((aba) =>
        aba.href === ativa ? (
          <span key={aba.href} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand text-center text-on-solid shadow-sm">
            {aba.label}
          </span>
        ) : (
          <Link key={aba.href} href={aba.href} className="toque flex min-h-11 flex-1 items-center justify-center rounded-full text-center text-ink-muted hover:text-ink">
            {aba.label}
          </Link>
        ),
      )}
    </div>
  );
}
