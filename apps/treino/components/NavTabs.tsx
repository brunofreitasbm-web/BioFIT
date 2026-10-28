"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Hoje" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/coach", label: "Coach IA" },
];

// Abas de índice de caderno na borda direita, com o texto na vertical: ficam sob o polegar e
// liberam a base da tela. Um toque tem 44 px de largura e 118 px de altura.
export function NavTabs() {
  const pathname = usePathname();
  // A área /isabela tem navegação própria (app/isabela/layout.tsx).
  if (pathname.startsWith("/isabela")) return null;

  const ativa = TABS.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));

  return (
    <nav role="navigation" aria-label="Navegação Principal" className="fixed right-0 top-36 z-20 flex w-11 flex-col gap-1.5">
      {TABS.map(({ href, label }, i) => {
        const active = i === ativa;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[118px] rotate-180 items-center justify-center rounded-r-xl border text-[15px] [writing-mode:vertical-rl]",
              active
                ? "border-brand bg-brand font-semibold text-on-solid"
                : "border-r-0 border-line/60 bg-base-800 font-medium text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
