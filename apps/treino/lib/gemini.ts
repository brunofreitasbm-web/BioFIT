// Cliente mínimo para o Gemini API. A chave nunca é hardcoded aqui — vem sempre de
// `getGeminiApiKey()` (localStorage do navegador, ver components/InsightIACard.tsx),
// exatamente como o resto dos dados deste app (sem backend).
const MODELO = "gemini-flash-latest";
const MAX_TENTATIVAS = 3;
const BACKOFF_BASE_MS = 1000;

export class GeminiError extends Error {}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarGemini(prompt: string, apiKey: string): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
}

export async function pedirInsightIA(prompt: string, apiKey: string): Promise<string> {
  let resp: Response | undefined;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    resp = await chamarGemini(prompt, apiKey);

    // 503 = modelo sobrecarregado no momento. Vale tentar de novo com backoff.
    if (resp.status !== 503 || tentativa === MAX_TENTATIVAS) break;
    await esperar(BACKOFF_BASE_MS * tentativa);
  }

  if (!resp) throw new GeminiError("Não foi possível falar com o Gemini agora.");

  if (!resp.ok) {
    if (resp.status === 503) {
      throw new GeminiError("O Gemini está sobrecarregado no momento. Tente novamente em alguns segundos.");
    }
    const corpo = await resp.text().catch(() => "");
    throw new GeminiError(`Gemini respondeu ${resp.status}: ${corpo.slice(0, 200)}`);
  }

  const json = await resp.json();
  const texto = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new GeminiError("Gemini não retornou nenhum texto.");
  return texto;
}
