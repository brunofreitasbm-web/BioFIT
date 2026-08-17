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
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-900/95 backdrop-blur">
      <div className="flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors",
                active ? "text-accent" : "text-ink-muted",
              )}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
