"use client";

import { useEffect, useState } from "react";
import type { RegistroBioimpedancia } from "@/lib/tipos";
import { formatarDataBR } from "@/lib/bioimpedancia";
import { getGeminiApiKey, setGeminiApiKey, removerGeminiApiKey } from "@/lib/storage";
import { pedirInsightIA, GeminiError } from "@/lib/gemini";
import { calcularVolumePorGrupo } from "@/lib/relatorio";
import { calcularStreak, totalSeriesRegistradas } from "@/lib/motivacao";
import { toISODate } from "@/lib/program";
import { Sparkles } from "lucide-react";

function montarPrompt(registros: RegistroBioimpedancia[]): string {
  const tabela = registros
    .map(
      (r) =>
        `${formatarDataBR(r.data)}: peso ${r.pesoKg}kg, gordura ${r.percentualGordura}% (${r.massaGorduraKg}kg), massa livre de gordura ${r.massaLivreGorduraKg}kg, água ${r.aguaCorporalL}L, gordura visceral nível ${r.nivelGorduraVisceral}, IMC ${r.imc}`,
    )
    .join("\n");

  const hojeISO = toISODate(new Date());
  const volumes = calcularVolumePorGrupo(30)
    .map((v) => `${v.grupo}: ${v.seriesFeitas} séries (${v.pct.toFixed(0)}%)`)
    .join(", ");
  const streak = calcularStreak(hojeISO);
  const totalSeries = totalSeriesRegistradas();

  return `Você é um assistente de treino de hipertrofia. Aqui está o histórico de bioimpedância do usuário (mais antigo primeiro):
${tabela}

E o volume de treino dos últimos 30 dias por grupo muscular: ${volumes}.
Streak atual de dias treinados seguidos: ${streak}. Total histórico de séries registradas: ${totalSeries}.

O programa é um PPL (Push/Pull/Legs) de hipertrofia com foco secundário em correção postural (hipercifose), em fase de manutenção/recomposição corporal.

Cruze a evolução da bioimpedância com o volume de treino e responda em português, de forma direta e curta (no máximo 5 frases): (1) o que os números sugerem sobre a recomposição corporal, (2) se algum grupo muscular parece estar com volume desalinhado com a evolução de massa magra, e (3) um ajuste concreto e específico a considerar no treino ou na rotina, se houver algum sinal de alerta.`;
}

export function InsightIACard({ registros }: { registros: RegistroBioimpedancia[] }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [inputChave, setInputChave] = useState("");
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyState(getGeminiApiKey());
  }, []);

  function salvarChave() {
    if (!inputChave.trim()) return;
    setGeminiApiKey(inputChave.trim());
    setApiKeyState(inputChave.trim());
    setInputChave("");
    setMostrarConfig(false);
  }

  function trocarChave() {
    removerGeminiApiKey();
    setApiKeyState(null);
    setResultado(null);
    setMostrarConfig(true);
  }

  async function perguntar() {
    if (!apiKey || registros.length === 0) return;
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const texto = await pedirInsightIA(montarPrompt(registros), apiKey);
      setResultado(texto);
    } catch (e) {
      setErro(e instanceof GeminiError ? e.message : "Não foi possível falar com o Gemini agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-soft bg-brand-soft p-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <Sparkles aria-hidden="true" size={15} strokeWidth={2} /> Análise por IA (Gemini)
        </p>
        {apiKey && (
          <button type="button" onClick={trocarChave} className="text-[11px] text-ink-muted underline">
            trocar chave
          </button>
        )}
      </div>

      {!apiKey || mostrarConfig ? (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            Cole sua chave de API do Gemini (Google AI Studio). Ela fica só no seu navegador (localStorage) — nunca é enviada
            para nenhum servidor além do próprio Gemini.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={inputChave}
              onChange={(e) => setInputChave(e.target.value)}
              placeholder="Chave de API do Gemini"
              aria-label="Chave de API do Gemini"
              className="flex-1 rounded-lg border border-line bg-base-800 px-3 py-2 text-sm text-ink"
            />
            <button type="button" onClick={salvarChave} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white">
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={perguntar}
            disabled={carregando || registros.length === 0}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {carregando && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {carregando ? "Analisando..." : "Cruzar bioimpedância com o treino"}
          </button>
          {erro && <p className="text-xs text-danger">{erro}</p>}
          {resultado && <p className="whitespace-pre-line text-sm text-ink-muted">{resultado}</p>}
        </div>
      )}
    </div>
  );
}
