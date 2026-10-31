import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";
import { Shell } from "@/components/Shell";
import { TimerDescanso } from "@/components/TimerDescanso";
import { RegistrarSW } from "@/components/RegistrarSW";
import { IniciarSync } from "@/components/IniciarSync";

// Self-hospedadas via next/font (sem chamada de rede em runtime — importante pra PWA usada
// offline na academia). Barlow é a fonte do texto; a versão Condensed fica nos títulos
// e nos números de destaque (cargas, séries, stats), onde o formato estreito dá peso.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const barlowCondensada = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Tema visual: "papel" (livro de bordo: papel claro e azul-marinho), "vidro" (vidro fosco com
// destaque violeta-gelo), "laranja" (preto e laranja) ou null
// (azul claro/escuro do sistema). É a única linha a trocar para voltar ao visual anterior; os
// tokens de cada tema ficam em globals.css. A área /isabela mantém o laranja (ver TEMA_POR_ROTA).
const TEMA: "papel" | "vidro" | "laranja" | null = "papel";

// Roda antes da primeira pintura, para /isabela não piscar no tema do app principal.
const TEMA_POR_ROTA = `if(location.pathname.indexOf("/isabela")===0)document.documentElement.setAttribute("data-tema","laranja")`;

export const metadata = {
  title: "Treino PPL",
  description: "Programa de hipertrofia PPL — hoje, registro e relatório de volume",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "BioFIT", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor:
    TEMA === "papel"
      ? "#faf8f3"
      : TEMA === "vidro"
      ? "#090a11"
      : TEMA === "laranja"
      ? "#0f1216"
      : [
          { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
          { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
        ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-tema={TEMA ?? undefined}
      className={`${barlow.variable} ${barlowCondensada.variable}`}
      suppressHydrationWarning
    >
      <head>{(TEMA === "papel" || TEMA === "vidro") && <script dangerouslySetInnerHTML={{ __html: TEMA_POR_ROTA }} />}</head>
      <body>
        <Shell>
          <main className="flex-1 pb-24">{children}</main>
          <TimerDescanso />
          <NavTabs />
        </Shell>
        <RegistrarSW />
        <IniciarSync />
      </body>
    </html>
  );
}
