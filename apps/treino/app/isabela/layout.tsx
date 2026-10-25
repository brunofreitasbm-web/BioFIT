import type { ReactNode } from "react";
import { NavTabs } from "@/components/isabela/NavTabs";
import { TimerDescanso } from "@/components/isabela/TimerDescanso";

// Área da Isabela dentro do mesmo projeto: sem conexão com os dados do Bruno (chaves de
// armazenamento "isabela:*", sem sync, sem MCP). O layout raiz esconde a navegação e o timer
// dele quando a rota começa com /isabela e este layout põe os dela.
export const metadata = {
  title: "Meu Treino",
  description: "Treino do dia, registro de séries, semanas seguidas e conquistas",
  manifest: "/isabela/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Meu Treino", statusBarStyle: "default" as const },
};

export default function IsabelaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TimerDescanso />
      <NavTabs />
    </>
  );
}
