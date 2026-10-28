"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Key,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Dumbbell,
  ShieldAlert,
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
import type { ContextoTreinoIA } from "@/lib/ai/prompts";

interface AiCoachModalProps {
  aberto: boolean;
  onFechar: () => void;
  contextoInicial?: ContextoTreinoIA | null;
}

const SUGESTOES_RAPIDAS = [
  { label: "🎯 Qual carga usar agora?", prompt: "Com base no meu histórico recente e RIR alvo, qual carga devo usar na próxima série e por quê?" },
  { label: "🔄 Máquina ocupada (substituir)", prompt: "A máquina do exercício atual está ocupada. Quais são as 2 melhores alternativas equivalentes com mesma biomecânica?" },
  { label: "💡 Foco biomecânico", prompt: "Quais são os 3 pontos de foco técnico e biomecânico mais importantes para a execução segura e eficiente deste exercício?" },
  { label: "⚠️ Dor / Desconforto articular", prompt: "Estou sentindo um incômodo articular durante este movimento. O que pode estar errado na forma ou como posso adaptar com segurança?" },
  { label: "📊 Avaliar meu progresso", prompt: "Faça uma breve análise do meu progresso recente no mesociclo e me diga se devo aumentar carga ou volume." },
];

export function AiCoachModal({ aberto, onFechar, contextoInicial }: AiCoachModalProps) {
  const [mensagens, setMensagens] = useState<SavedMessage[]>([]);
  const [inputTexto, setInputTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Configuração da chave de API
  const [mostrarConfigChave, setMostrarConfigChave] = useState(false);
  const [chaveInput, setChaveInput] = useState("");
  const [chaveSalvaComSucesso, setChaveSalvaComSucesso] = useState(false);

  // Reconhecimento de voz (Web Speech API)
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const recognitionRef = useRef<any>(null);

  const mensagensFimRef = useRef<HTMLDivElement | null>(null);

  // Carrega histórico e chave ao abrir
  useEffect(() => {
    if (aberto) {
      setMensagens(getSavedChatHistory());
      setChaveInput(getLocalDeepSeekKey());
      setErro(null);
    }
  }, [aberto]);

  // Rola para a mensagem mais recente
  useEffect(() => {
    if (aberto) {
      mensagensFimRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens, aberto, carregando]);

  // Configuração do Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "pt-BR";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputTexto((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setGravandoAudio(false);
        };

        recognition.onerror = () => {
          setGravandoAudio(false);
        };

        recognition.onend = () => {
          setGravandoAudio(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  function toggleGravacao() {
    if (!recognitionRef.current) {
      alert("Reconhecimento de voz não suportado pelo seu navegador atual.");
      return;
    }

    if (gravandoAudio) {
      recognitionRef.current.stop();
      setGravandoAudio(false);
    } else {
      try {
        recognitionRef.current.start();
        setGravandoAudio(true);
      } catch {
        setGravandoAudio(false);
      }
    }
  }

  function handleSalvarChave() {
    setLocalDeepSeekKey(chaveInput);
    setChaveSalvaComSucesso(true);
    setTimeout(() => {
      setChaveSalvaComSucesso(false);
      setMostrarConfigChave(false);
    }, 1200);
  }

  function handleLimparHistorico() {
    if (window.confirm("Deseja apagar todo o histórico de conversa com o Coach?")) {
      clearSavedChatHistory();
      setMensagens([]);
    }
  }

  async function enviarMensagem(textoParaEnviar?: string) {
    const texto = (textoParaEnviar ?? inputTexto).trim();
    if (!texto || carregando) return;

    setErro(null);
    setInputTexto("");

    const novaMsgUser: SavedMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: texto,
      timestamp: new Date().toISOString(),
    };

    const novasMensagens = [...mensagens, novaMsgUser];
    setMensagens(novasMensagens);
    setCarregando(true);

    const msgIdAssistente = `assistant-${Date.now()}`;
    const placeholderAssistente: SavedMessage = {
      id: msgIdAssistente,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMensagens([...novasMensagens, placeholderAssistente]);

    try {
      const apiKeyLocal = getLocalDeepSeekKey();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: novasMensagens.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: contextoInicial,
          apiKey: apiKeyLocal || undefined,
        }),
      });

      if (!res.ok) {
        let errData = "";
        try {
          const errJson = await res.json();
          errData = errJson.error || errJson.message || "Erro desconhecido";
        } catch {
          errData = await res.text();
        }
        throw new Error(errData || `Erro HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Resposta sem fluxo de dados.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let textoCompleto = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        textoCompleto += chunk;

        setMensagens((prev) =>
          prev.map((m) => (m.id === msgIdAssistente ? { ...m, content: textoCompleto } : m)),
        );
      }

      const mensagensFinais = [
        ...novasMensagens,
        { ...placeholderAssistente, content: textoCompleto },
      ];
      saveChatHistory(mensagensFinais);
    } catch (err: any) {
      console.error("Falha ao comunicar com DeepSeek:", err);
      const msgErro = err?.message || "Não foi possível conectar à IA.";
      setErro(msgErro);
      // Remove o placeholder vazio em caso de falha imediata
      setMensagens((prev) => prev.filter((m) => m.id !== msgIdAssistente));
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-base-950/80 p-0 sm:p-4 backdrop-blur-sm anim-revelar"
    >
      <div className="flex h-[92dvh] sm:h-[85vh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-line vidro-forte shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b border-line bg-base-800 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-brand-hover text-on-solid shadow-sm">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
                  BioFIT Coach
                </h2>
                <span className="inline-flex items-center rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                  DeepSeek
                </span>
              </div>
              <p className="text-xs text-ink-muted">Treinador com auto-regulação e biomecânica</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMostrarConfigChave(!mostrarConfigChave)}
              title="Configurar chave de API"
              className={cn(
                "rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-700 hover:text-ink",
                mostrarConfigChave && "bg-base-700 text-brand",
              )}
            >
              <Key size={18} />
            </button>

            {mensagens.length > 0 && (
              <button
                type="button"
                onClick={handleLimparHistorico}
                title="Limpar histórico"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-700 hover:text-danger"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-700 hover:text-ink"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Banner de Contexto Ativo */}
        {contextoInicial?.exercicioAtual && (
          <div className="flex items-center gap-2 border-b border-line bg-base-950/60 px-4 py-2 text-xs">
            <Dumbbell size={14} className="text-brand shrink-0" />
            <div className="truncate text-ink-muted">
              Foco: <span className="font-semibold text-ink">{contextoInicial.exercicioAtual.nome}</span>{" "}
              ({contextoInicial.exercicioAtual.grupoMuscular})
            </div>
          </div>
        )}

        {/* Painel expansível de configuração da chave */}
        {mostrarConfigChave && (
          <div className="border-b border-line bg-base-800/90 p-4 anim-revelar">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                Chave da API DeepSeek
              </span>
              <span className="text-xs text-ink-faint">Armazenada com segurança no seu navegador</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-..."
                value={chaveInput}
                onChange={(e) => setChaveInput(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-base-700 px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-brand"
              />
              <button
                type="button"
                onClick={handleSalvarChave}
                className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-solid transition-transform active:scale-95 hover:bg-brand-hover"
              >
                {chaveSalvaComSucesso ? <Check size={14} /> : "Salvar"}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Também pode ser configurada no arquivo <code className="rounded bg-base-700 px-1 text-ink">.env.local</code> como <code className="rounded bg-base-700 px-1 text-brand">DEEPSEEK_API_KEY</code>.
            </p>
          </div>
        )}

        {/* Mensagem de Erro se houver */}
        {erro && (
          <div className="flex items-start gap-2 border-b border-danger/40 bg-danger-soft px-4 py-2.5 text-xs text-danger">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Falha ao consultar Coach:</strong> {erro}
              {erro.includes("não configurada") && (
                <button
                  type="button"
                  onClick={() => setMostrarConfigChave(true)}
                  className="mt-1 block underline text-ink hover:text-brand"
                >
                  Toque aqui para inserir sua chave da API DeepSeek
                </button>
              )}
            </div>
          </div>
        )}

        {/* Área de Mensagens */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-base-800 text-brand shadow-inner">
                <Sparkles size={24} />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">
                Olá! Sou seu Coach BioFIT
              </h3>
              <p className="mt-1 max-w-xs text-xs text-ink-muted">
                Pergunte sobre cargas, execução, substituição de exercícios ou análise de mesociclo.
              </p>

              <div className="mt-6 w-full space-y-1.5 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Ações Rápidas de Treino:
                </span>
                <div className="flex flex-col gap-1.5">
                  {SUGESTOES_RAPIDAS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => enviarMensagem(s.prompt)}
                      className="rounded-xl border vidro p-2.5 text-xs text-ink text-left transition-colors hover:border-brand/60 hover:bg-base-700 active:scale-[0.99]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
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
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                    msg.role === "user"
                      ? "rounded-br-sm bg-brand text-on-solid font-medium"
                      : "rounded-bl-sm border border-line bg-base-800 text-ink",
                  )}
                >
                  {msg.content ? (
                    msg.content
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-faint">
                      <RefreshCw size={13} className="animate-spin" /> Pensando...
                    </span>
                  )}
                </div>
                <span className="mt-1 px-1 text-[11px] text-ink-faint">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
          <div ref={mensagensFimRef} />
        </div>

        {/* Chips de Sugestão se já existirem mensagens */}
        {mensagens.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-line bg-base-950/40 px-3 py-2 no-scrollbar">
            {SUGESTOES_RAPIDAS.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                type="button"
                disabled={carregando}
                onClick={() => enviarMensagem(s.prompt)}
                className="shrink-0 rounded-full border border-line bg-base-800 px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-brand/40 hover:text-ink active:scale-95 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Campo de Entrada de Mensagem */}
        <footer className="border-t border-line bg-base-800 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensagem();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleGravacao}
              title={gravandoAudio ? "Parar gravação" : "Falar mensagem por voz"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line transition",
                gravandoAudio
                  ? "bg-danger text-on-solid border-danger animate-pulse"
                  : "bg-base-700 text-ink-muted hover:text-ink hover:border-brand/50",
              )}
            >
              {gravandoAudio ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder={gravandoAudio ? "Escutando..." : "Pergunte ao Coach BioFIT..."}
              disabled={carregando}
              className="flex-1 rounded-xl border border-line bg-base-700 px-3.5 py-2.5 text-xs sm:text-sm text-ink placeholder:text-ink-faint focus:border-brand"
            />

            <button
              type="submit"
              disabled={carregando || !inputTexto.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-solid transition hover:bg-brand-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {carregando ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
