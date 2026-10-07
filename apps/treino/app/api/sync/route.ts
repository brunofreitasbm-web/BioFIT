import { NextResponse } from "next/server";
import { contarSeries, gravarBackup, lerBackup, reducaoSuspeita, tokenDoHeader, tokenValido, validarCorpoSync } from "@/lib/servidor/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O app envia aqui o mesmo JSON do "Baixar backup". Autenticado por SYNC_TOKEN (Bearer).
export async function POST(req: Request) {
  if (!tokenValido(tokenDoHeader(req), process.env.SYNC_TOKEN)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const validado = validarCorpoSync(await req.text());
  if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: 400 });

  try {
    // Aparelho novo/limpo não pode apagar o histórico já guardado: sem série nem sessão no
    // payload, só aceita se o servidor também estiver vazio.
    const vazio = !validado.dados["treino:log"] && !validado.dados["treino:sessoesPorDia"];
    const guardado = await lerBackup();
    if (vazio && guardado) {
      return NextResponse.json({ erro: "Backup local vazio; histórico do servidor preservado." }, { status: 409 });
    }
    // Queda brusca de séries: só passa com confirmação explícita ("Enviar agora" no app).
    const forcar = req.headers.get("x-sync-forcar") === "1";
    if (guardado && !forcar && reducaoSuspeita(guardado.dados, validado.dados)) {
      return NextResponse.json(
        {
          erro: `Este aparelho tem ${contarSeries(validado.dados)} séries e o servidor ${contarSeries(guardado.dados)}. Restaure o backup ou use "Enviar agora" para confirmar.`,
        },
        { status: 409 },
      );
    }
    await gravarBackup(validado.dados);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Falha ao gravar." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, atualizadoEm: new Date().toISOString() });
}
