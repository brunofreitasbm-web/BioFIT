import { NextResponse } from "next/server";
import { dadosDoBackup } from "@/lib/dados";
import { gravarMesclado, lerBackup, tokenDoHeader, tokenValido } from "@/lib/servidor/backup";
import { contextoDe, descreverFerramenta, estadoDoDia, FERRAMENTAS, type Ferramenta } from "@/lib/servidor/ferramentas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Servidor MCP (Streamable HTTP, sem estado, só JSON-RPC por POST). Implementado à mão: o
// protocolo usado aqui é pequeno (initialize, ping, tools/list, tools/call) e não compensa
// uma dependência.
//
// Autenticação por MCP_TOKEN:
//  - header `Authorization: Bearer <token>` (Claude Code, Gemini CLI, qualquer cliente com headers);
//  - ou segmento de caminho `/api/mcp/<token>` para clientes que só aceitam uma URL (conector
//    customizado do claude.ai). A URL vira a credencial: não compartilhe nem cole em lugar público.

const VERSOES_SUPORTADAS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCOES = [
  "Dados de treino do BioFIT (app de musculação, programa A→E em mesociclos com deload).",
  "Leitura: plano_do_dia (o que fazer hoje, com carga sugerida), treino_do_dia (o que foi feito), status_programa, resumo_periodo, relatorio_volume, progresso, historico_exercicio, relatorio_semanal, listar_exercicios.",
  "Composição corporal (bioimpedância Avanutri): evolucao_corpo para ler; importar_bioimpedancia recebe o link do botão “Acessar Relatório” do e-mail “Relatório bioimpedância” (remetente noreply@avanutrionline.com) e importa até 6 medições, sem duplicar. A bioimpedância é ruidosa: não conclua progresso ou piora sem olhar o veredito, a confiança e os avisos de evolucao_corpo.\nEscrita de treino: registrar_series, remover_serie, iniciar_sessao, terminar_sessao, registrar_bike. Confirme com o usuário carga/reps antes de gravar; use ids de plano_do_dia ou listar_exercicios.",
  "Postura (fotos avaliadas no app, sem guardar a foto): evolucao_postura traz cifose torácica, ângulo craniovertebral, tronco e alinhamento frontal por sessão, com veredito e confiança. Diferença de 2–3° entre sessões é ruído de protocolo, não evolução.",
  "Os dados vêm do último sync do app (ao gravar, abrir e trocar de aba); o app recebe o que você gravar no próximo sync. Chame status_sync se precisar saber o quão atual está.",
].join(" ");

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

function texto(conteudo: unknown, isError = false) {
  return { ...(isError ? { isError } : {}), content: [{ type: "text", text: typeof conteudo === "string" ? conteudo : JSON.stringify(conteudo) }] };
}

async function executar(ferramenta: Ferramenta, args: Record<string, unknown>): Promise<unknown> {
  const backup = await lerBackup();
  if (!backup) return texto("Nenhum dado sincronizado ainda. Abra o app e configure o envio.", true);
  const ctx = contextoDe(backup);

  if (ferramenta.tipo === "leitura") {
    return texto({ atualizadoEm: backup.atualizadoEm, ...((await ferramenta.executar(args, ctx)) as object) });
  }

  const { entrada, data, mensagem, detalhe } = await ferramenta.escrever(args, ctx);
  const gravou = Object.keys(entrada).length > 0;
  const final = gravou ? await gravarMesclado(entrada, "mcp") : backup;
  return texto({
    ok: true,
    mensagem,
    atualizadoEm: final.atualizadoEm,
    ...(gravou ? { aviso: "O app recebe a mudança no próximo sync (ao abrir ou voltar para a aba)." } : {}),
    ...(detalhe !== undefined ? { detalhe } : {}),
    ...(data ? { dia: estadoDoDia(dadosDoBackup(final.dados), data) } : {}),
  });
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
        serverInfo: { name: "biofit-treino", version: "0.2.0" },
        instructions: INSTRUCOES,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: FERRAMENTAS.map(descreverFerramenta) });
    case "tools/call": {
      const ferramenta = FERRAMENTAS.find((f) => f.name === params.name);
      if (!ferramenta) return falha(id, -32602, `Ferramenta desconhecida: ${String(params.name)}`);
      try {
        return ok(id, await executar(ferramenta, (params.arguments ?? {}) as Record<string, unknown>));
      } catch (e) {
        return ok(id, texto(e instanceof Error ? e.message : "Erro.", true));
      }
    }
    default:
      return falha(id, -32601, `Método não suportado: ${method}`);
  }
}

export async function POST(req: Request, { params }: { params: { token?: string[] } }) {
  const tokenUrl = params.token?.filter(Boolean).join("/") || null;
  const candidato = tokenDoHeader(req) ?? tokenUrl;
  if (!tokenValido(candidato, process.env.MCP_TOKEN)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(falha(null, -32700, "JSON inválido."), { status: 400 });
  }

  // Em lote, uma mensagem por vez: duas escritas em paralelo só disputariam a gravação.
  if (Array.isArray(corpo)) {
    const respostas: unknown[] = [];
    for (const m of corpo) {
      const r = await tratar(m as RpcRequest);
      if (r !== null) respostas.push(r);
    }
    return respostas.length ? NextResponse.json(respostas) : new NextResponse(null, { status: 202 });
  }
  const resposta = await tratar(corpo as RpcRequest);
  return resposta === null ? new NextResponse(null, { status: 202 }) : NextResponse.json(resposta);
}

// Sem canal SSE servidor→cliente: a especificação permite 405.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id",
    },
  });
}
