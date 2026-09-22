"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearToken } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/dashboard/exercicios", label: "Exercícios", icon: "🏋️" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("biofit_token");
    if (!token) {
      router.replace("/");
      return;
    }
    if (pathname === "/dashboard") {
      router.replace("/dashboard/exercicios");
      return;
    }
    setReady(true);
  }, [router, pathname]);

  function logout() {
    clearToken();
    router.replace("/");
  }

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-base-950 text-ink border-x border-line/20 shadow-2xl">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-base-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-black text-base-950">
            B
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">BioFIT</span>
            <span className="text-[10px] text-ink-muted">Painel do Personal</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-xs text-ink-muted hover:text-ink">
          Sair
        </Button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 sm:p-5">{children}</main>

      {/* Bottom Mobile Tab Bar */}
      <nav
        role="navigation"
        aria-label="Navegação do Personal"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl border-t border-line bg-base-900/95 shadow-[0_-1px_8px_rgba(20,22,26,0.06)] backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {NAV.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors duration-150",
                  active
                    ? "font-semibold text-accent"
                    : "font-medium text-ink-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "text-base leading-none transition-transform duration-150",
                    active && "-translate-y-px scale-110",
                  )}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span className={cn(active && "font-semibold")}>{tab.label}</span>
                <span
                  className={cn(
                    "h-0.5 w-4 rounded-full transition-all duration-150",
                    active ? "bg-accent" : "bg-transparent",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

