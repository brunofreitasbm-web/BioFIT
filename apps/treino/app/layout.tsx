import type { ReactNode } from "react";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata = {
  title: "Treino PPL",
  description: "Programa de hipertrofia PPL — hoje, registro e relatório de volume",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Treino PPL",
  },
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
        <RegisterSW />
      </body>
    </html>
  );
}
