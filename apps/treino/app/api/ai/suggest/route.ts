import { NextResponse } from "next/server";
import { callDeepSeekSync } from "@/lib/ai/deepseek";
import { BIOFIT_SYSTEM_PROMPT, formatarContextoParaPrompt, type ContextoTreinoIA } from "@/lib/ai/prompts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tipo, context, apiKey, perguntaCustomizada } = body as {
      tipo: "carga" | "substituicao" | "biomecanica" | "geral";
      context?: ContextoTreinoIA;
      apiKey?: string;
      perguntaCustomizada?: string;
    };

    const contextText = formatarContextoParaPrompt(context);

    let orientacao = "";
    if (tipo === "carga") {
      orientacao =
        "Analise o histórico e sugira a carga ideal (em kg) e repetições para a próxima série deste exercício. Explique a justificativa científica em 2 a 3 frases curtas.";
    } else if (tipo === "substituicao") {
      orientacao =
        "O aparelho está ocupado ou o atleta precisa de alternativa. Sugira 2 opções de exercícios substitutos biomecanicamente equivalentes que recrutem o mesmo grupo muscular, informando a carga de partida aproximada.";
    } else if (tipo === "biomecanica") {
      orientacao =
        "Dê 3 instruções de foco interno e biomecânico cruciais para a execução perfeita e segura deste exercício, evitando lesões articulares.";
    } else {
      orientacao = perguntaCustomizada || "Dê uma orientação rápida para otimizar a sessão atual.";
    }

    const messages = [
      {
        role: "system" as const,
        content: `${BIOFIT_SYSTEM_PROMPT}\n\nVocê deve ser ultraconciso (máximo 120 palavras). Responda com tópicos curtos e claros diretamente aplicáveis na academia.`,
      },
      {
        role: "user" as const,
        content: `### Contexto Atual:\n${contextText}\n\n### Solicitação:\n${orientacao}`,
      },
    ];

    const resposta = await callDeepSeekSync({
      messages,
      options: {
        model: "deepseek-chat",
        apiKey,
        temperature: 0.3,
        max_tokens: 350,
      },
    });

    return NextResponse.json({ resposta });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno ao processar sugestão rápida.";
    console.error("[BioFIT AI Suggest Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
