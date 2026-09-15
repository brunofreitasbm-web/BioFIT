"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hoje", icon: "🏋️" },
  { href: "/relatorio", label: "Relatório", icon: "📊" },
  { href: "/bioimpedancia", label: "Corpo", icon: "🧬" },
];

export interface BottomNavigationProps {
  items?: NavItem[];
}

export function BottomNavigation({ items = DEFAULT_NAV_ITEMS }: BottomNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Navegação Principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl border-t border-slate-200 bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around">
        {items.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors duration-150 ${
                isActive
                  ? "font-semibold text-[#2563EB] dark:text-blue-500"
                  : "font-medium text-[#64748B] hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`text-xl leading-none transition-transform duration-150 ${
                  isActive ? "-translate-y-0.5 scale-110" : ""
                }`}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              <span
                className={`h-0.5 w-6 rounded-full transition-all duration-150 ${
                  isActive ? "bg-[#2563EB] opacity-100 dark:bg-blue-500" : "bg-transparent opacity-0"
                }`}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
