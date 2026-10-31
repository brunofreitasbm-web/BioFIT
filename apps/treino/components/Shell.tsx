"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// Largura do conteúdo: o app é mobile-first (max-w-xl), mas o painel de recuperação é feito
// para o computador e usa a tela inteira até 1280 px.
export function Shell({ children }: { children: ReactNode }) {
  const largo = usePathname().startsWith("/painel");
  return <div className={cn("mx-auto flex min-h-dvh flex-col", largo ? "max-w-xl md:max-w-7xl" : "max-w-xl")}>{children}</div>;
}
