export interface DeepSeekChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekChatOptions {
  model?: "deepseek-chat" | "deepseek-reasoner";
  temperature?: number;
  max_tokens?: number;
  apiKey?: string;
}

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function getResolvedApiKey(providedKey?: string): string | null {
  if (providedKey && providedKey.trim().length > 0) {
    return providedKey.trim();
  }
  return process.env.DEEPSEEK_API_KEY || null;
}

export async function createDeepSeekStream({
  messages,
  options = {},
}: {
  messages: DeepSeekChatMessage[];
  options?: DeepSeekChatOptions;
}): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getResolvedApiKey(options.apiKey);

  if (!apiKey) {
    throw new Error(
      "Chave da API DeepSeek não configurada. Defina DEEPSEEK_API_KEY no arquivo .env.local ou informe nas configurações do Coach.",
    );
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? "deepseek-chat",
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
      stream: true,
    }),
  });

  if (!response.ok) {
    let erroTexto = "";
    try {
      const errJson = await response.json();
      erroTexto = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      erroTexto = await response.text();
    }
    throw new Error(`Erro na API DeepSeek (${response.status}): ${erroTexto}`);
  }

  if (!response.body) {
    throw new Error("Resposta da API DeepSeek sem corpo de dados (body).");
  }

  // Cria um stream de transformação para extrair o delta.content do SSE
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed === "data: [DONE]") {
              controller.close();
              return;
            }

            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Linha JSON incompleta, ignora e segue o buffer
              }
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function callDeepSeekSync({
  messages,
  options = {},
}: {
  messages: DeepSeekChatMessage[];
  options?: DeepSeekChatOptions;
}): Promise<string> {
  const apiKey = getResolvedApiKey(options.apiKey);

  if (!apiKey) {
    throw new Error(
      "Chave da API DeepSeek não configurada. Defina DEEPSEEK_API_KEY no arquivo .env.local ou informe nas configurações do Coach.",
    );
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? "deepseek-chat",
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 1000,
      stream: false,
    }),
  });

  if (!response.ok) {
    let erroTexto = "";
    try {
      const errJson = await response.json();
      erroTexto = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      erroTexto = await response.text();
    }
    throw new Error(`Erro na API DeepSeek (${response.status}): ${erroTexto}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}
