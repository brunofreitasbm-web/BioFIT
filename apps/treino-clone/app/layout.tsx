import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";
import { TimerDescanso } from "@/components/TimerDescanso";
import { RegistrarSW } from "@/components/RegistrarSW";

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

// Tema visual: "laranja" (preto e laranja, sempre escuro) ou null (azul claro/escuro do sistema).
// É a única linha a trocar para voltar ao azul; os tokens de cada tema ficam em globals.css.
const TEMA: "laranja" | null = "laranja";

export const metadata = {
  title: "Meu Treino",
  description: "Treino do dia, registro de séries, sequência e conquistas",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Meu Treino", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor:
    TEMA === "laranja"
      ? "#0f1216"
      : [
          { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
          { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
        ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-tema={TEMA ?? undefined} className={`${barlow.variable} ${barlowCondensada.variable}`}>
      <body>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <TimerDescanso />
          <NavTabs />
        </div>
        <RegistrarSW />
      </body>
    </html>
  );
}
