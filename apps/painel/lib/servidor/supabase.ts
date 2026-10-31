// Acesso somente leitura ao Supabase pelas funções RPC (mesmo segredo do app de treino). Usa a
// chave publicável, nunca a service role. REST direto, sem dependência.

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.BIOFIT_DB_SECRET);
}

export async function rpc(nome: string, corpo: Record<string, unknown>): Promise<unknown> {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  const segredo = process.env.BIOFIT_DB_SECRET;
  if (!url || !chave || !segredo) throw new Error("Servidor sem SUPABASE_URL / SUPABASE_ANON_KEY / BIOFIT_DB_SECRET.");
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: chave, "Content-Type": "application/json" },
    body: JSON.stringify({ p_secret: segredo, ...corpo }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status} em ${nome}.`);
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}
