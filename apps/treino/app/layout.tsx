import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";

// Self-hospedada via next/font (sem chamada de rede em runtime — importante pra PWA usada
// offline na academia). Geométrica e com números tabulares fortes: é a voz do app nos
// títulos e nos números de destaque (cargas, séries, stats), substituindo a pilha de fonte
// de sistema genérica.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Treino PPL",
  description: "Programa de hipertrofia PPL — hoje, registro e relatório de volume",
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
    <html lang="pt-BR" className={manrope.variable}>
      <body>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <NavTabs />
        </div>
      </body>
    </html>
  );
}
