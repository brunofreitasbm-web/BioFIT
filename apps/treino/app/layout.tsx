import type { ReactNode } from "react";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";

export const metadata = {
  title: "Treino PPL",
  description: "Programa de hipertrofia PPL — hoje, registro e relatório de volume",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f4f5f7",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <NavTabs />
        </div>
      </body>
    </html>
  );
}
