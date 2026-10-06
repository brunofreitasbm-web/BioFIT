import { NextResponse } from "next/server";
import { lerBackup, tokenDoHeader, tokenValido } from "@/lib/servidor/backup";
import { FERRAMENTAS } from "@/lib/servidor/ferramentasMcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Servidor MCP (Streamable HTTP, sem estado, só JSON-RPC por POST). Implementado à mão: são
// 4 ferramentas de leitura, não compensa uma dependência.
//
// Autenticação por MCP_TOKEN:
//  - header `Authorization: Bearer <token>` (Claude Code, Gemini CLI, qualquer cliente com headers);
//  - ou segmento de caminho `/api/mcp/<token>` para clientes que só aceitam uma URL (conector
//    customizado do claude.ai). A URL vira a credencial: não compartilhe nem cole em lugar público.

const VERSOES_SUPORTADAS = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function ok(id: RpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function falha(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function tratar(msg: RpcRequest): Promise<unknown | null> {
  const { id, method, params = {} } = msg;
  if (!method) return falha(id, -32600, "Requisição inválida.");
  // Notificações (sem id) não têm resposta.
  if (id === undefined) return null;

  switch (method) {
    case "initialize": {
      const pedida = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return ok(id, {
        protocolVersion: VERSOES_SUPORTADAS.includes(pedida) ? pedida : VERSOES_SUPORTADAS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "biofit-treino", version: "0.1.0" },
        instructions:
          "Dados de treino do BioFIT (somente leitura). Os dados vêm do último envio do app: chame status_sync se precisar saber o quão atual está.",
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: FERRAMENTAS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case "tools/call": {
      const ferramenta = FERRAMENTAS.find((f) => f.name === params.name);
      if (!ferramenta) return falha(id, -32602, `Ferramenta desconhecida: ${String(params.name)}`);
      try {
        const backup = await lerBackup();
        if (!backup) {
          return ok(id, {
            isError: true,
            content: [{ type: "text", text: "Nenhum dado sincronizado ainda. Abra o app e configure o envio." }],
          });
        }
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        const resultado = ferramenta.executar(args, backup);
        return ok(id, { content: [{ type: "text", text: JSON.stringify({ atualizadoEm: backup.atualizadoEm, ...(resultado as object) }) }] });
      } catch (e) {
        return ok(id, { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "Erro." }] });
      }
    }
    default:
      return falha(id, -32601, `Método não suportado: ${method}`);
  }
}

export async function POST(req: Request, { params }: { params: { token?: string[] } }) {
  const candidato = tokenDoHeader(req) ?? params.token?.[0] ?? null;
  if (!tokenValido(candidato, process.env.MCP_TOKEN)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(falha(null, -32700, "JSON inválido."), { status: 400 });
  }

  if (Array.isArray(corpo)) {
    const respostas = (await Promise.all(corpo.map((m) => tratar(m as RpcRequest)))).filter((r) => r !== null);
    return respostas.length ? NextResponse.json(respostas) : new NextResponse(null, { status: 202 });
  }
  const resposta = await tratar(corpo as RpcRequest);
  return resposta === null ? new NextResponse(null, { status: 202 }) : NextResponse.json(resposta);
}

// Sem canal SSE servidor→cliente: a especificação permite 405.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
