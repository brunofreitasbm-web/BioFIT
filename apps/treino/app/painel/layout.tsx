import type { ReactNode } from "react";

export const metadata = {
  title: "BioFIT Painel",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: ReactNode }) {
  return children;
}
