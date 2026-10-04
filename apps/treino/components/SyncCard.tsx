"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw, Sheet } from "lucide-react";
import { ICON } from "@/lib/icones";
import { getLog } from "@/lib/storage";
import {
  enfileirarHistorico,
  enviarPendentes,
  getConfigSync,
  getStatusSync,
  ouvirSync,
  salvarConfigSync,
  type StatusSync,
} from "@/lib/sync";

export function SyncCard() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [status, setStatus] = useState<StatusSync>({ pendentes: 0, ultimoEnvio: null, erro: null });
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    const c = getConfigSync();
    if (c) {
      setUrl(c.url);
      setToken(c.token);
      setAtivo(true);
    }
    setStatus(getStatusSync());
    return ouvirSync(() => setStatus(getStatusSync()));
  }, []);

  function salvar() {
    if (!url.trim()) {
      salvarConfigSync(null);
      setAtivo(false);
      setMensagem("Envio desligado.");
      return;
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url.trim())) {
      setMensagem("A URL deve ser a do Web App (https://script.google.com/macros/s/…/exec).");
      return;
    }
    salvarConfigSync({ url, token });
    setAtivo(true);
    setMensagem("Salvo.");
    void enviarPendentes();
  }

  function reenviarHistorico() {
    const n = enfileirarHistorico(getLog());
    setMensagem(`${n} séries na fila.`);
  }

  const ultimo = status.ultimoEnvio ? new Date(status.ultimoEnvio).toLocaleString("pt-BR") : null;

  return (
    <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Sheet aria-hidden="true" size={ICON.md} className="text-ink-muted" /> Planilha Google
        </h2>
        <p className="text-xs text-ink-muted">
          Cada série registrada é enviada para a aba “Dados do app”. Sem rede, fica na fila e segue depois.
        </p>
      </div>
      <input
        type="url"
        inputMode="url"
        placeholder="URL do Web App (…/exec)"
        aria-label="URL do Web App do Google Apps Script"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
      />
      <input
        type="password"
        autoComplete="off"
        placeholder="Token"
        aria-label="Token do script"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-brand bg-brand text-xs font-semibold text-on-solid shadow-sm hover:opacity-90"
        >
          Salvar
        </button>
        <button
          type="button"
          disabled={!ativo}
          onClick={reenviarHistorico}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-base-700 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" size={ICON.sm} /> Reenviar histórico
        </button>
      </div>
      {ativo && (
        <p
          role="status"
          className={
            status.erro
              ? "flex items-start gap-1.5 text-xs font-medium text-danger"
              : "flex items-start gap-1.5 text-xs text-accent"
          }
        >
          {status.erro ? (
            <CircleAlert aria-hidden="true" size={ICON.sm} className="shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" size={ICON.sm} className="shrink-0" />
          )}
          {status.erro
            ? `Falha no envio (${status.erro}). ${status.pendentes} na fila; nova tentativa automática.`
            : status.pendentes > 0
              ? `${status.pendentes} na fila.`
              : `Tudo enviado${ultimo ? ` · último envio ${ultimo}` : ""}.`}
        </p>
      )}
      {mensagem && <p className="text-xs text-ink-muted">{mensagem}</p>}
    </section>
  );
}
