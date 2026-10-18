import { NextResponse } from "next/server";
import { KEY_ORIGEM } from "@/lib/dados";
import { gravarMesclado, lerBackup, tokenDoHeader, tokenValido, validarCorpoSync } from "@/lib/servidor/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Aparelho novo ou navegador limpo: baixa o histórico guardado no servidor.
export async function GET(req: Request) {
  if (!tokenValido(tokenDoHeader(req), process.env.SYNC_TOKEN)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const backup = await lerBackup();
    if (!backup) return NextResponse.json({ erro: "Nenhum backup no servidor." }, { status: 404 });
    const { [KEY_ORIGEM]: _meta, ...paraApp } = backup.dados;
    return NextResponse.json({ ok: true, atualizadoEm: backup.atualizadoEm, dados: paraApp });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Falha ao ler." }, { status: 502 });
  }
}

// O app envia aqui o mesmo JSON do "Baixar backup". Autenticado por SYNC_TOKEN (Bearer).
// O servidor mescla com o que já tem (o MCP também grava) e devolve o resultado para o app.
export async function POST(req: Request) {
  if (!tokenValido(tokenDoHeader(req), process.env.SYNC_TOKEN)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const validado = validarCorpoSync(await req.text());
  if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: 400 });

  try {
    // Aparelho novo/limpo não pode impor o que tem ao histórico já guardado (data de início,
    // escolhas...): sem série nem sessão no payload, só aceita se o servidor também estiver vazio.
    const vazio = !validado.dados["treino:log"] && !validado.dados["treino:sessoesPorDia"];
    if (vazio && (await lerBackup())) {
      return NextResponse.json({ erro: "Backup local vazio; histórico do servidor preservado." }, { status: 409 });
    }
    const { [KEY_ORIGEM]: _origem, ...entrada } = validado.dados;
    const { dados, atualizadoEm } = await gravarMesclado(entrada, "app");
    const { [KEY_ORIGEM]: _meta, ...paraApp } = dados;
    return NextResponse.json({ ok: true, atualizadoEm, dados: paraApp });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Falha ao gravar." }, { status: 502 });
  }
}
