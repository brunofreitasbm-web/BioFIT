"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { exportarTudo, importarTudo } from "@/lib/storage";
import { toISODate } from "@/lib/program";

// Os dados só existem no localStorage deste navegador: sem backup, limpar os dados do site
// ou trocar de aparelho apaga todo o histórico (e os gráficos de evolução junto).
export function BackupCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

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
        <h2 className="text-base font-semibold text-ink">Backup do histórico</h2>
        <p className="text-xs text-ink-muted">
          Seus treinos ficam só neste navegador. Baixe um backup de vez em quando para não perder a evolução.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={baixar}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-brand bg-brand text-xs font-semibold text-brand-ink shadow-sm hover:opacity-90"
        >
          <Download aria-hidden="true" size={15} /> Baixar backup
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-base-700 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <Upload aria-hidden="true" size={15} /> Restaurar
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
      {mensagem && (
        <p role="status" className={mensagem.tipo === "erro" ? "text-xs font-medium text-danger" : "text-xs text-accent"}>
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
