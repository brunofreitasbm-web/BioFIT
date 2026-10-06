"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Download, HardDriveDownload, RefreshCw, Upload } from "lucide-react";
import { ICON } from "@/lib/icones";
import { exportarTudo, importarTudo } from "@/lib/storage";
import { toISODate } from "@/lib/program";
import { getTokenSync, getUltimoSync, setTokenSync, sincronizarAgora } from "@/lib/sync";

// Os dados só existem no localStorage deste navegador: sem backup, limpar os dados do site
// ou trocar de aparelho apaga todo o histórico (e os gráficos de evolução junto).
export function BackupCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [token, setToken] = useState("");
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    setToken(getTokenSync());
    setUltimoSync(getUltimoSync());
  }, []);

  async function enviarAgora() {
    setTokenSync(token.trim());
    setSincronizando(true);
    const r = await sincronizarAgora();
    setSincronizando(false);
    if (r.ok) {
      setUltimoSync(r.quando);
      setMensagem({ tipo: "ok", texto: "Histórico enviado ao servidor." });
    } else {
      setMensagem({ tipo: "erro", texto: r.motivo });
    }
  }

  function baixar() {
    const backup = exportarTudo();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treino-backup-${toISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMensagem({ tipo: "ok", texto: "Backup baixado." });
  }

  async function restaurar(arquivo: File) {
    const texto = await arquivo.text();
    if (!window.confirm("Restaurar este backup vai SUBSTITUIR todo o histórico atual deste aparelho. Continuar?")) return;
    const erro = importarTudo(texto);
    if (erro) {
      setMensagem({ tipo: "erro", texto: erro });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Backup restaurado. Recarregando…" });
    window.location.reload();
  }

  return (
    <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <HardDriveDownload aria-hidden="true" size={ICON.md} className="text-ink-muted" /> Backup do histórico
        </h2>
        <p className="text-xs text-ink-muted">
          Seus treinos ficam só neste navegador. Baixe um backup de vez em quando para não perder a evolução.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={baixar}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-brand bg-brand text-xs font-semibold text-on-solid shadow-sm hover:opacity-90"
        >
          <Download aria-hidden="true" size={ICON.sm} /> Baixar backup
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-base-700 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <Upload aria-hidden="true" size={ICON.sm} /> Restaurar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) void restaurar(arquivo);
          }}
        />
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-xs text-ink-muted">
          Envio automático para o servidor (usado pelo MCP com Claude/Gemini). Cole o token de sync uma vez neste aparelho.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token de sync"
            aria-label="Token de sync"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-base-700 px-4 text-xs text-ink"
          />
          <button
            type="button"
            onClick={() => void enviarAgora()}
            disabled={sincronizando || !token.trim()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-base-700 px-4 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" size={ICON.sm} /> {sincronizando ? "Enviando…" : "Enviar agora"}
          </button>
        </div>
        {ultimoSync && (
          <p className="text-xs text-ink-muted">Último envio: {new Date(ultimoSync).toLocaleString("pt-BR")}</p>
        )}
      </div>
      {mensagem && (
        <p
          role="status"
          className={
            mensagem.tipo === "erro"
              ? "flex items-start gap-1.5 text-xs font-medium text-danger"
              : "flex items-start gap-1.5 text-xs text-accent"
          }
        >
          {mensagem.tipo === "erro" ? (
            <CircleAlert aria-hidden="true" size={ICON.sm} className="shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" size={ICON.sm} className="shrink-0" />
          )}
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
