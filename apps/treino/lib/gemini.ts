// Cliente mínimo para o Gemini API. A chave nunca é hardcoded aqui — vem sempre de
// `getGeminiApiKey()` (localStorage do navegador, ver components/InsightIACard.tsx),
// exatamente como o resto dos dados deste app (sem backend).
const MODELO = "gemini-flash-latest";

export class GeminiError extends Error {}

export async function pedirInsightIA(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new GeminiError(`Gemini respondeu ${resp.status}: ${corpo.slice(0, 200)}`);
  }

  const json = await resp.json();
  const texto = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new GeminiError("Gemini não retornou nenhum texto.");
  return texto;
}
