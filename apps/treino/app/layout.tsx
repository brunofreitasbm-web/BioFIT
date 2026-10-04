import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";

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
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <NavTabs />
        </div>
      </body>
    </html>
  );
}
