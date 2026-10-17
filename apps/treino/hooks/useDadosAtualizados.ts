"use client";

import { useEffect, useState } from "react";
import { EVENTO_DADOS_ATUALIZADOS } from "@/lib/sync";

// Versão que sobe quando o sync traz do servidor algo gravado em outro lugar (ex.: pelo MCP).
// Use como dependência de efeitos ou na `key` de componentes que leem o storage no mount.
export function useDadosAtualizados(): number {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const subir = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_DADOS_ATUALIZADOS, subir);
    return () => window.removeEventListener(EVENTO_DADOS_ATUALIZADOS, subir);
  }, []);
  return versao;
}
