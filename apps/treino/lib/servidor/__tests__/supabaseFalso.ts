import { vi } from "vitest";

// Emula as RPCs do Supabase (biofit_backup_get/put/put_se) em cima de um fetch falso.
export function instalarSupabaseFalso(inicial: Record<string, string> | null) {
  const estado = {
    dados: inicial,
    atualizadoEm: inicial ? "2026-10-09T12:00:00.000Z" : (null as string | null),
    gravacoes: 0,
    // Chamado antes de cada put_se: permite simular outra gravação no meio.
    aoGravar: null as null | (() => void),
    sem_put_se: false,
  };
  let relogio = 0;
  const novoCarimbo = () => new Date(Date.parse("2026-10-09T12:00:00.000Z") + ++relogio * 1000).toISOString();

  vi.stubEnv("SUPABASE_URL", "https://fake.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("BIOFIT_DB_SECRET", "segredo");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      const nome = url.split("/rpc/")[1];
      const corpo = JSON.parse(init.body);
      const resp = (valor: unknown, status = 200) => new Response(valor === undefined ? "" : JSON.stringify(valor), { status });
      if (nome === "biofit_backup_get") {
        return resp(estado.dados ? { dados: estado.dados, atualizado_em: estado.atualizadoEm } : null);
      }
      if (nome === "biofit_backup_put") {
        estado.dados = corpo.p_dados;
        estado.atualizadoEm = novoCarimbo();
        estado.gravacoes++;
        return resp(undefined);
      }
      if (nome === "biofit_backup_put_se") {
        if (estado.sem_put_se) return resp({ message: "not found" }, 404);
        estado.aoGravar?.();
        estado.aoGravar = null;
        if (corpo.p_esperado !== estado.atualizadoEm) return resp(null);
        estado.dados = corpo.p_dados;
        estado.atualizadoEm = novoCarimbo();
        estado.gravacoes++;
        return resp(estado.atualizadoEm);
      }
      return resp({ message: "?" }, 404);
    }),
  );
  return estado;
}
