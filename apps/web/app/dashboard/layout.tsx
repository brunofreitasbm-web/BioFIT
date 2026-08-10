"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearToken } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Alunos" },
  { href: "/dashboard/exercicios", label: "Exercícios" },
  { href: "/dashboard/desafios", label: "Desafios" },
  { href: "/dashboard/cobrancas", label: "Cobranças" },
  { href: "/dashboard/branding", label: "Branding" },
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
    setReady(true);
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-base-900/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-black text-base-950">
              B
            </div>
            <span className="font-semibold tracking-tight">BioFIT</span>
          </div>
          <div className="hidden gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-base-700 text-ink"
                    : "text-ink-muted hover:bg-base-800 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sair
        </Button>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
