"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";

const CHAVE = "biofit-ui:detalhes-dia";

// Tudo que é contexto (sessão, Garmin, programa, bike, próximo treino) fica recolhido aqui
// para a tela Hoje mostrar só o treino. `forcarAberto` abre quando há algo que pede atenção
// (dia de descanso, queda de aderência). Aberto/fechado é preferência só deste aparelho.
export function DetalhesDoDia({ forcarAberto = false, children }: { forcarAberto?: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    try {
      setAberto(localStorage.getItem(CHAVE) === "1");
    } catch {
      // armazenamento indisponível: começa fechado
    }
  }, []);

  function alternar() {
    const novo = !mostrar;
    setAberto(novo);
    try {
      if (novo) localStorage.setItem(CHAVE, "1");
      else localStorage.removeItem(CHAVE);
    } catch {
      // idem
    }
  }

  const mostrar = aberto || forcarAberto;

  return (
    <section className="mt-4" aria-label="Detalhes do dia">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={mostrar}
        className="toque flex min-h-11 w-full items-center justify-between gap-2 border-t border-line pt-2 text-left text-sm font-semibold text-ink-muted"
      >
        Detalhes do dia
        <ChevronDown
          aria-hidden="true"
          size={ICON.md}
          className={cn("shrink-0 text-ink-faint transition-transform duration-200", mostrar && "rotate-180")}
        />
      </button>
      {mostrar && <div className="anim-revelar mt-2">{children}</div>}
    </section>
  );
}
