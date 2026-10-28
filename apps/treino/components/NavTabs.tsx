"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Hoje" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/coach", label: "Coach IA" },
];

// Abas de índice de caderno na base da tela, em linha: ocupam a largura toda e deixam o
// conteúdo usar a tela inteira. Cada toque tem pelo menos 48 px de altura.
export function NavTabs() {
  const pathname = usePathname();
  // A área /isabela tem navegação própria (app/isabela/layout.tsx).
  if (pathname.startsWith("/isabela")) return null;

  const ativa = TABS.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl gap-1.5 px-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ href, label }, i) => {
        const active = i === ativa;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-t-xl border border-b-0 text-[15px]",
              active
                ? "border-brand bg-brand font-semibold text-on-solid"
                : "border-line/60 bg-base-800 font-medium text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
