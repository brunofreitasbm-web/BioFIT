import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata = {
  title: "BioFIT Painel",
  description: "Visão geral de treino, recuperação e corpo (uso no computador)",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="mx-auto min-h-dvh max-w-7xl">{children}</div>
      </body>
    </html>
  );
}
