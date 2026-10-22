"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Trash2,
  Key,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getLocalDeepSeekKey,
  getSavedChatHistory,
  saveChatHistory,
  clearSavedChatHistory,
  setLocalDeepSeekKey,
  type SavedMessage,
} from "@/lib/ai/aiStorage";
import { getDataInicio, getSessaoEscolhida } from "@/lib/storage";
import { getStatusPrograma, sessaoSugerida as calcularSessaoSugerida, toISODate } from "@/lib/program";
import { SESSAO_NOME } from "@/lib/exercicios";
import type { ContextoTreinoIA } from "@/lib/ai/prompts";
import { contextoBioimpedancia } from "@/lib/bioimpedancia";
import { BioimpedanciaCard } from "@/components/BioimpedanciaCard";

const PROMPTS_SUGERIDOS = [
  "Analise minha última bioimpedância e me diga o que ajustar no treino.",
  "Estou ganhando massa magra ou só peso? Considere meus treinos e recuperação.",
  "Meu sono e Body Battery de hoje permitem treinar pesado?",
  "Qual a melhor estratégia para o Deload na Rodada 5?",
];

export default function CoachPage() {
  const [mensagens, setMensagens] = useState<SavedMessage[]>([]);
  const [inputTexto, setInputTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarConfigChave, setMostrarConfigChave] = useState(false);
  const [chaveInput, setChaveInput] = useState("");
  const [chaveSalva, setChaveSalva] = useState(false);

  const [gravando, setGravando] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);

  const [contexto, setContexto] = useState<ContextoTreinoIA | null>(null);

  useEffect(() => {
    setMensagens(getSavedChatHistory());
    setChaveInput(getLocalDeepSeekKey());

    // Monta contexto do programa atual
    const hojeISO = toISODate(new Date());
    const dataInicio = getDataInicio() ?? hojeISO;
    const sessaoEscolhida = getSessaoEscolhida(hojeISO);
    const sessaoSug = calcularSessaoSugerida(dataInicio, hojeISO);
    const sessaoEfetiva = sessaoEscolhida === "DESCANSO" ? null : (sessaoEscolhida ?? sessaoSug);
    const status = getStatusPrograma(dataInicio, hojeISO, sessaoEfetiva);

    const base: ContextoTreinoIA = status
      ? {
          sessao: sessaoEfetiva,
          sessaoNome: sessaoEfetiva ? SESSAO_NOME[sessaoEfetiva] : "Descanso",
          statusPrograma: {
            meso: status.meso,
            rodada: status.rodada,
            isDeload: status.isDeload,
          },
        }
      : {};
    setContexto({ ...base, bioimpedancia: contextoBioimpedancia() });

    fetch("/api/garmin/today")
      .then((r) => r.json())
      .then((d) => {
        if (d?.disponivel && d.biometria) {
          setContexto((c) => ({
            ...(c ?? {}),
            biometriaGarmin: {
              bodyBattery: d.biometria.bodyBattery ?? undefined,
              sonoHoras: d.biometria.sonoHoras ?? undefined,
              stress: d.biometria.stress ?? undefined,
              hrvStatus: d.biometria.hrvStatus ?? undefined,
            },
          }));
        }
      })
      .catch(() => {});
  }, []);

  function atualizarBioimpedancia() {
    setContexto((c) => ({ ...(c ?? {}), bioimpedancia: contextoBioimpedancia() }));
  }

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "pt-BR";
        recognition.onresult = (event: any) => {
          setInputTexto((prev) => `${prev} ${event.results[0][0].transcript}`.trim());
          setGravando(false);
        };
        recognition.onerror = () => setGravando(false);
        recognition.onend = () => setGravando(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  function toggleGravacao() {
    if (!recognitionRef.current) {
      alert("Navegador não suporta reconhecimento de voz.");
      return;
    }
    if (gravando) {
      recognitionRef.current.stop();
      setGravando(false);
    } else {
      try {
        recognitionRef.current.start();
        setGravando(true);
      } catch {
        setGravando(false);
      }
    }
  }

  function salvarChave() {
    setLocalDeepSeekKey(chaveInput);
    setChaveSalva(true);
    setTimeout(() => {
      setChaveSalva(false);
      setMostrarConfigChave(false);
    }, 1000);
  }

  async function enviar(textoOverride?: string) {
    const texto = (textoOverride ?? inputTexto).trim();
    if (!texto || carregando) return;

    setErro(null);
    setInputTexto("");

    const novaMsg: SavedMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: texto,
      timestamp: new Date().toISOString(),
    };

    const atualizadas = [...mensagens, novaMsg];
    setMensagens(atualizadas);
    setCarregando(true);

    const idAssistente = `assistant-${Date.now()}`;
    const placeholder: SavedMessage = {
      id: idAssistente,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMensagens([...atualizadas, placeholder]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: atualizadas.map((m) => ({ role: m.role, content: m.content })),
          context: contexto,
          apiKey: getLocalDeepSeekKey() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("Sem resposta da API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMensagens((prev) =>
          prev.map((m) => (m.id === idAssistente ? { ...m, content: acc } : m)),
        );
      }

      const finais = [...atualizadas, { ...placeholder, content: acc }];
      saveChatHistory(finais);
    } catch (e: any) {
      setErro(e.message || "Erro de conexão.");
      setMensagens((prev) => prev.filter((m) => m.id !== idAssistente));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-5rem)]">
      {/* Topo */}
      <header className="sticky top-0 z-10 border-b border-line bg-base-950/80 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-ink">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="font-display text-base font-bold uppercase tracking-wider text-ink">
                BioFIT AI Coach
              </h1>
              <p className="text-[11px] text-ink-muted">DeepSeek V3 · Hipertrofia & Ciência</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMostrarConfigChave(!mostrarConfigChave)}
              className={cn(
                "rounded-lg p-2 text-ink-muted hover:bg-base-800 hover:text-ink transition-colors",
                mostrarConfigChave && "bg-base-800 text-brand",
              )}
              title="Configurar chave API"
            >
              <Key size={18} />
            </button>
            {mensagens.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Limpar mensagens?")) {
                    clearSavedChatHistory();
                    setMensagens([]);
                  }
                }}
                className="rounded-lg p-2 text-ink-muted hover:bg-base-800 hover:text-danger transition-colors"
                title="Limpar histórico"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {mostrarConfigChave && (
          <div className="mt-3 rounded-xl border border-line bg-base-800 p-3">
            <div className="flex justify-between text-xs text-ink-muted mb-1.5">
              <span>Chave da API DeepSeek</span>
              {chaveSalva && <span className="text-accent flex items-center gap-1"><Check size={12}/> Salva!</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-..."
                value={chaveInput}
                onChange={(e) => setChaveInput(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-base-700 px-3 py-1.5 text-xs text-ink focus:border-brand"
              />
              <button
                type="button"
                onClick={salvarChave}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-hover"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo de Mensagens */}
      <div className="flex-1 space-y-3 p-4 overflow-y-auto">
        {contexto?.statusPrograma && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-base-800/60 px-3 py-2 text-xs text-ink-muted">
            <span>
              Meso <strong className="text-ink">{contexto.statusPrograma.meso}</strong> · Rodada{" "}
              <strong className="text-ink">{contexto.statusPrograma.rodada}</strong>
            </span>
            {contexto.sessao && (
              <span className="rounded bg-brand/10 px-2 py-0.5 text-brand font-semibold">
                Sessão {contexto.sessao} ({contexto.sessaoNome})
              </span>
            )}
          </div>
        )}
        <BioimpedanciaCard onAtualizar={atualizarBioimpedancia} />

        {erro && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-xs text-danger">
            <AlertCircle size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {mensagens.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-base-800 text-brand">
              <Sparkles size={28} />
            </div>
            <h2 className="font-display text-lg font-bold uppercase text-ink">
              Como posso te ajudar hoje?
            </h2>
            <div className="grid gap-2 text-left max-w-md mx-auto">
              {PROMPTS_SUGERIDOS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => enviar(p)}
                  className="rounded-xl border border-line bg-base-800 p-3 text-xs text-ink hover:border-brand/50 hover:bg-base-700 transition-all active:scale-[0.99]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-brand text-brand-ink font-medium"
                    : "border border-line bg-base-800 text-ink",
                )}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1.5 text-ink-faint">
                    <RefreshCw size={14} className="animate-spin" /> Analisando...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      {/* Input de envio fixado */}
      <div className="sticky bottom-14 border-t border-line bg-base-950/90 p-3 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleGravacao}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border border-line transition-all shrink-0",
              gravando
                ? "bg-danger text-danger-ink border-danger animate-pulse"
                : "bg-base-800 text-ink-muted hover:text-ink",
            )}
            title="Ditar por voz"
          >
            {gravando ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            placeholder={gravando ? "Ouvindo sua voz..." : "Mensagem para o Coach..."}
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            disabled={carregando}
            className="flex-1 rounded-xl border border-line bg-base-800 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
          />

          <button
            type="submit"
            disabled={carregando || !inputTexto.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-ink transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-40 shrink-0"
          >
            {carregando ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
