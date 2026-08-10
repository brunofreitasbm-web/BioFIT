"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Banner, Button, Card, EmptyState, Input, Select, Skeleton } from "@/components/ui";

interface Aluno {
  id: string;
  nome: string;
}

interface Cobranca {
  id: string;
  valorCentavos: number;
  status: "PENDENTE" | "PAGO" | "VENCIDO";
  descricao: string | null;
  pixCopiaCola: string | null;
  aluno: { nome: string };
  createdAt: string;
}

const STATUS_STYLE: Record<Cobranca["status"], string> = {
  PENDENTE: "border-brand/30 bg-brand-soft text-ink",
  PAGO: "border-accent/30 bg-accent-soft text-accent",
  VENCIDO: "border-danger/30 bg-danger-soft text-danger",
};

export default function CobrancasPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[] | null>(null);
  const [alunoId, setAlunoId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [alunosRes, cobrancasRes] = await Promise.all([api<Aluno[]>("/alunos"), api<Cobranca[]>("/cobrancas")]);
    setAlunos(alunosRes);
    if (alunosRes[0]) setAlunoId((prev) => prev || alunosRes[0].id);
    setCobrancas(cobrancasRes);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/cobrancas", {
        method: "POST",
        body: {
          alunoId,
          valorCentavos: Math.round(Number(valor) * 100),
          descricao: descricao || undefined,
        },
      });
      setValor("");
      setDescricao("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Cobranças (PIX)</h1>
        <p className="text-sm text-ink-muted">Cobre mensalidade dos seus alunos via PIX, direto pelo app</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select label="Aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="flex-1">
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            className="w-32"
          />
          <Input
            label="Descrição (opcional)"
            placeholder="Ex: Mensalidade julho"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={saving} disabled={!alunoId}>
            Gerar cobrança
          </Button>
        </form>
        {error && (
          <div className="mt-3">
            <Banner variant="error">{error}</Banner>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Requer um Access Token do Mercado Pago configurado em <code>apps/api/.env</code> (variável{" "}
          <code>MP_ACCESS_TOKEN</code>) — conta gratuita, só desconta taxa por transação recebida.
        </p>
      </Card>

      {cobrancas === null && <Skeleton className="h-16" />}
      {cobrancas?.length === 0 && <EmptyState title="Nenhuma cobrança gerada ainda" />}

      <div className="flex flex-col gap-2">
        {cobrancas?.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="text-sm font-medium">
                {c.aluno.nome} — R$ {(c.valorCentavos / 100).toFixed(2)}
              </p>
              <p className="text-xs text-ink-muted">{c.descricao ?? "Sem descrição"}</p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[c.status]}`}>
              {c.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
