"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Banner, Button, Card, EmptyState, Skeleton } from "@/components/ui";

interface Aluno {
  id: string;
  nome: string;
}

interface Ficha {
  id: string;
  titulo: string;
  semana: number;
  ativa: boolean;
  blocos: { id: string; tipo: string; itens: { id: string }[] }[];
}

export default function AlunoFichasPage() {
  const { id } = useParams<{ id: string }>();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [fichas, setFichas] = useState<Ficha[] | null>(null);
  const [assignTargets, setAssignTargets] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [alunosRes, fichasRes] = await Promise.all([
      api<Aluno[]>("/alunos"),
      api<Ficha[]>(`/fichas/aluno/${id}`),
    ]);
    setAlunos(alunosRes);
    setFichas(fichasRes);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function clonar(fichaId: string) {
    await api(`/fichas/${fichaId}/clonar`, { method: "POST" });
    setMsg("Semana clonada com sucesso.");
    await load();
  }

  async function atribuir(fichaId: string) {
    const alunoIds = assignTargets[fichaId] ?? [];
    if (alunoIds.length === 0) {
      setMsg("Selecione ao menos um aluno para atribuir.");
      return;
    }
    const criadas = await api<unknown[]>("/fichas/bulk-assign", {
      method: "POST",
      body: { fichaOrigemId: fichaId, alunoIds },
    });
    setMsg(`Ficha aplicada a ${criadas.length} aluno(s).`);
  }

  const alunoAtual = alunos.find((a) => a.id === id);
  const outrosAlunos = alunos.filter((a) => a.id !== id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard" className="text-xs text-ink-muted hover:text-ink">
        ← Alunos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Fichas de {alunoAtual?.nome ?? "..."}</h1>
        <Link href={`/dashboard/alunos/${id}/nova-ficha`}>
          <Button>+ Nova ficha</Button>
        </Link>
      </div>

      {msg && <Banner variant="info">{msg}</Banner>}

      {fichas === null && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {fichas?.length === 0 && (
        <EmptyState
          title="Nenhuma ficha ainda"
          description="Monte a primeira ficha de treino deste aluno."
          action={
            <Link href={`/dashboard/alunos/${id}/nova-ficha`}>
              <Button>+ Nova ficha</Button>
            </Link>
          }
        />
      )}

      {fichas?.map((f) => (
        <Card key={f.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.titulo}</span>
                <span className="text-xs text-ink-faint">semana {f.semana}</span>
                {f.ativa && (
                  <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                    ativa
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {f.blocos.length} bloco(s) · {f.blocos.reduce((n, b) => n + b.itens.length, 0)} exercício(s)
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => clonar(f.id)}>
              Clonar como próxima semana
            </Button>
          </div>

          {outrosAlunos.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <select
                multiple
                className="min-w-[180px] rounded-lg border border-line bg-base-900 px-2 py-1.5 text-sm text-ink"
                size={Math.min(4, outrosAlunos.length)}
                value={assignTargets[f.id] ?? []}
                onChange={(e) =>
                  setAssignTargets({
                    ...assignTargets,
                    [f.id]: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
              >
                {outrosAlunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={() => atribuir(f.id)}>
                Aplicar aos alunos selecionados
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
