"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Hoje", icon: "🏋️" },
  { href: "/relatorio", label: "Relatório", icon: "📊" },
  { href: "/bioimpedancia", label: "Corpo", icon: "🧬" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-900/95 shadow-[0_-1px_8px_rgba(20,22,26,0.06)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors",
                active ? "text-accent" : "text-ink-muted",
              )}
            >
              <span
                className={cn(
                  "text-lg leading-none",
                  active && "-translate-y-px",
                )}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className={cn(active && "font-semibold")}>{tab.label}</span>
              <span
                className={cn("h-0.5 w-5 rounded-full transition-colors", active ? "bg-accent" : "bg-transparent")}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
