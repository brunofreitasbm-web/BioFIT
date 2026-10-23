import type { ReactNode } from "react";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";
import { TimerDescanso } from "@/components/TimerDescanso";
import { RegistrarSW } from "@/components/RegistrarSW";
import { IniciarSync } from "@/components/IniciarSync";

// Self-hospedadas via next/font (sem chamada de rede em runtime — importante pra PWA usada
// offline na academia). Barlow é a fonte do texto; a versão Semi Condensed fica nos títulos
// e nos números de destaque (cargas, séries, stats), onde o formato estreito dá peso.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const barlowCondensada = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensada.variable}`}>
      <body>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <TimerDescanso />
          <NavTabs />
        </div>
        <RegistrarSW />
        <IniciarSync />
      </body>
    </html>
  );
}
