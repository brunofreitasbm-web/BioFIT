import { NextResponse } from "next/server";
import { tokenValido } from "@/lib/servidor/backup";
import { gravarGarmin, supabaseConfigurado } from "@/lib/servidor/garmin";
import { converterPayload } from "@/lib/servidor/garminHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

// Endpoint de push da Garmin Health API (configurado no portal de desenvolvedores, em
// "Endpoint Configuration", modo PUSH). A Garmin não assina as entregas, então a credencial é o
// token no caminho (GARMIN_WEBHOOK_TOKEN, >= 24 caracteres) e, opcionalmente, GARMIN_API_USER_ID
// restringe ao seu usuário. Responde 200 só depois de gravar; em falha devolve 5xx para a
// Garmin reenviar.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!tokenValido(params.token, process.env.GARMIN_WEBHOOK_TOKEN)) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ erro: "servidor_sem_supabase" }, { status: 503 });
  }

  const texto = await req.text();
  if (texto.length > MAX_BYTES) return NextResponse.json({ erro: "payload_grande" }, { status: 413 });
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ erro: "json_invalido" }, { status: 400 });
  }

  const c = converterPayload(corpo, process.env.GARMIN_API_USER_ID || undefined);
  // Só nomes de resumo e contagens: o primeiro userId aparece aqui para você fixar GARMIN_API_USER_ID.
  console.log("[garmin webhook]", JSON.stringify({ usuarios: c.usuarios, diario: c.diario.length, treinos: c.treinos.length, ignorados: c.ignorados }));

  if (c.diario.length === 0 && c.treinos.length === 0) return NextResponse.json({ ok: true, diario: 0, treinos: 0 });
  try {
    return NextResponse.json({ ok: true, ...(await gravarGarmin(c)) });
  } catch (e) {
    console.error("[garmin webhook] falha ao gravar:", e);
    return NextResponse.json({ erro: "falha_ao_gravar" }, { status: 502 });
  }
}
