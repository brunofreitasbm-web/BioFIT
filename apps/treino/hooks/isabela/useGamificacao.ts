"use client";

import { useCallback, useEffect, useState } from "react";
import { calcularGamificacao, type Gamificacao } from "@/lib/isabela/gamificacao";
import { lerDadosLocais } from "@/lib/isabela/storage";

// Recalcula a gamificação a partir do histórico. `gatilho` é qualquer valor que mude quando o
// histórico muda (ex.: séries feitas na sessão); `recalcular` serve para chamar à mão.
export function useGamificacao(hojeISO: string, gatilho: unknown = 0): { g: Gamificacao | null; recalcular: () => void } {
  const [g, setG] = useState<Gamificacao | null>(null);
  const recalcular = useCallback(() => {
    setG(calcularGamificacao(lerDadosLocais(), hojeISO));
  }, [hojeISO]);
  useEffect(() => {
    recalcular();
  }, [recalcular, gatilho]);
  return { g, recalcular };
}
