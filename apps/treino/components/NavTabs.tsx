"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Dumbbell, LineChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Hoje", Icon: Dumbbell },
  { href: "/coach", label: "Coach IA", Icon: Sparkles },
  { href: "/painel", label: "Painel", Icon: Activity },
  { href: "/relatorio", label: "Relatório", Icon: LineChart },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-950/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors duration-150",
                active ? "font-semibold text-brand" : "font-medium text-ink-muted hover:text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                size={22}
                strokeWidth={active ? 2.25 : 1.75}
                className={cn("transition-transform duration-150", active && "-translate-y-px scale-110")}
              />
              <span className={cn(active && "font-semibold")}>{label}</span>
              <span
                className={cn("h-0.5 w-5 rounded-full transition-all duration-150", active ? "bg-brand" : "bg-transparent")}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
