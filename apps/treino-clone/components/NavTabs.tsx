"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LineChart, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON, STROKE } from "@/lib/icones";

const TABS = [
  { href: "/", label: "Hoje", Icon: Dumbbell },
  { href: "/relatorio", label: "Relatório", Icon: LineChart },
  { href: "/conquistas", label: "Conquistas", Icon: Trophy },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-900/95 shadow-nav backdrop-blur"
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
                "toque flex min-h-14 flex-1 flex-col items-center gap-0.5 py-2.5 text-xs",
                active ? "font-semibold text-brand" : "font-medium text-ink-muted hover:text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                size={ICON.lg}
                strokeWidth={active ? STROKE.forte : 2}
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
