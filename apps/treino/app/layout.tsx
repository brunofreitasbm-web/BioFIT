import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";
import { Shell } from "@/components/Shell";
import { TimerDescanso } from "@/components/TimerDescanso";
import { RegistrarSW } from "@/components/RegistrarSW";
import { IniciarSync } from "@/components/IniciarSync";

// Self-hospedadas via next/font (sem chamada de rede em runtime — importante pra usar
// offline na academia). Barlow Condensed é a voz esportiva dos títulos e números de
// destaque; Barlow, da mesma família, no texto corrido.
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "BioFIT Treino",
  description: "Programa sequencial U/L/Push/Pull/Legs — treino do dia, registro e relatório",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "BioFIT", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F1216",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
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
