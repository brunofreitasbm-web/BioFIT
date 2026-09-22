"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LineChart, Activity } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Hoje", Icon: Dumbbell },
  { href: "/relatorio", label: "Relatório", Icon: LineChart },
  { href: "/bioimpedancia", label: "Corpo", Icon: Activity },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-900/95 shadow-[0_-1px_8px_rgba(20,22,26,0.06)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
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
