import { NextResponse, type NextRequest } from "next/server";

// Os dados são pessoais (saúde): o painel exige senha (HTTP Basic). Sem PAINEL_SENHA configurada
// em produção, recusa tudo (fail-closed). Em desenvolvimento local, sem senha, libera.
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function middleware(req: NextRequest) {
  const senha = process.env.PAINEL_SENHA ?? "";
  if (!senha) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Painel não configurado (defina PAINEL_SENHA).", { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("basic ")) {
    try {
      const decodificado = atob(auth.slice(6).trim());
      const candidata = decodificado.slice(decodificado.indexOf(":") + 1);
      if (iguais(candidata, senha)) return NextResponse.next();
    } catch {
      // cai no 401
    }
  }
  return new NextResponse("Acesso restrito.", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="BioFIT Painel", charset="UTF-8"' } });
}
