import { NextResponse } from "next/server";
import { createDeepSeekStream, type DeepSeekChatMessage } from "@/lib/ai/deepseek";
import { BIOFIT_SYSTEM_PROMPT, formatarContextoParaPrompt, type ContextoTreinoIA } from "@/lib/ai/prompts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, context, apiKey } = body as {
      messages: DeepSeekChatMessage[];
      context?: ContextoTreinoIA;
      apiKey?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Mensagens inválidas ou ausentes na requisição." },
        { status: 400 },
      );
    }

    const contextText = formatarContextoParaPrompt(context);
    const systemPromptComContexto = `${BIOFIT_SYSTEM_PROMPT}\n\n### Contexto do Treino Atual do Atleta:\n${contextText}`;

    const apiMessages: DeepSeekChatMessage[] = [
      { role: "system", content: systemPromptComContexto },
      ...messages.filter((m) => m.role === "user" || m.role === "assistant"),
    ];

    const stream = await createDeepSeekStream({
      messages: apiMessages,
      options: {
        model: "deepseek-chat",
        apiKey,
        temperature: 0.4,
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno ao processar IA.";
    console.error("[BioFIT AI Chat Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
