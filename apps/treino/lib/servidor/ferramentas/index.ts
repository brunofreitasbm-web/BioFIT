import { ESCRITA } from "./escrita";
import { LEITURA } from "./leitura";
import type { Ferramenta } from "./comum";

export { contextoDe, estadoDoDia, hojeBelem, type Contexto, type Ferramenta } from "./comum";

export const FERRAMENTAS: Ferramenta[] = [...LEITURA, ...ESCRITA];

// Formato de `tools/list`, com as anotações que os clientes usam para pedir confirmação.
export function descreverFerramenta(f: Ferramenta) {
  return {
    name: f.name,
    description: f.description,
    inputSchema: f.inputSchema,
    annotations:
      f.tipo === "leitura"
        ? { readOnlyHint: true, openWorldHint: false }
        : { readOnlyHint: false, destructiveHint: f.destrutiva, idempotentHint: f.idempotente, openWorldHint: false },
  };
}
