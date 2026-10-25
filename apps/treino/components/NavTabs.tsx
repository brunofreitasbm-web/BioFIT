"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LineChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON, STROKE } from "@/lib/icones";

const TABS = [
  { href: "/", label: "Hoje", Icon: Dumbbell },
  { href: "/relatorio", label: "Relatório", Icon: LineChart },
  { href: "/coach", label: "Coach IA", Icon: Sparkles },
];

export function NavTabs() {
  const pathname = usePathname();
  // A área /isabela tem navegação própria (app/isabela/layout.tsx).
  if (pathname.startsWith("/isabela")) return null;

  const ativa = TABS.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="vidro-barra fixed inset-x-3 bottom-3 z-20 mx-auto max-w-[calc(36rem-1.5rem)] rounded-2xl border shadow-nav"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex p-1">
        {/* Pílula que desliza até a aba ativa: uma só peça, movida por transform. */}
        {ativa >= 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-brand/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.32,0.64,1)]"
            style={{ width: `calc((100% - 0.5rem) / ${TABS.length})`, transform: `translateX(${ativa * 100}%)` }}
          />
        )}
        {TABS.map(({ href, label, Icon }, i) => {
          const active = i === ativa;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "toque relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs transition-colors duration-200",
                active ? "font-semibold text-brand" : "font-medium text-ink-muted hover:text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                size={ICON.lg}
                strokeWidth={active ? STROKE.forte : 2}
                className={cn("transition-transform duration-300 ease-[cubic-bezier(0.34,1.32,0.64,1)]", active && "-translate-y-px scale-110")}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
