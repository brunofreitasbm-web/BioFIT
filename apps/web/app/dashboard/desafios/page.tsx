"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Banner, Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";

interface Aluno {
  id: string;
  nome: string;
}

interface Desafio {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  participantes: { aluno: Aluno }[];
}

interface RankingEntry {
  alunoId: string;
  nome: string;
  volume: number;
}

interface Ranking {
  id: string;
  titulo: string;
  ranking: RankingEntry[];
}

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function DesafiosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [desafios, setDesafios] = useState<Desafio[] | null>(null);
  const [rankings, setRankings] = useState<Record<string, Ranking>>({});
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState(todayIso());
  const [fim, setFim] = useState(todayIso(30));
  const [alunoIds, setAlunoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [alunosRes, desafiosRes] = await Promise.all([api<Aluno[]>("/alunos"), api<Desafio[]>("/desafios")]);
    setAlunos(alunosRes);
    setDesafios(desafiosRes);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (alunoIds.length === 0) {
      setError("Selecione ao menos um aluno participante.");
      return;
    }
    setSaving(true);
    try {
      await api("/desafios", {
        method: "POST",
        body: {
          titulo,
          inicio: new Date(inicio).toISOString(),
          fim: new Date(fim).toISOString(),
          alunoIds,
        },
      });
      setTitulo("");
      setAlunoIds([]);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function verRanking(id: string) {
    const ranking = await api<Ranking>(`/desafios/${id}/ranking`);
    setRankings((prev) => ({ ...prev, [id]: ranking }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Desafio Gym Rats</h1>
        <p className="text-sm text-ink-muted">Ranking de volume total treinado entre os alunos, por período</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="flex-1" />
            <Input label="Início" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <Input label="Fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Participantes</label>
            <select
              multiple
              className="mt-1 w-full rounded-lg border border-line bg-base-900 px-2 py-1.5 text-sm"
              size={Math.min(5, Math.max(3, alunos.length))}
              value={alunoIds}
              onChange={(e) => setAlunoIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={saving} className="self-start">
            Criar desafio
          </Button>
        </form>
        {error && (
          <div className="mt-3">
            <Banner variant="error">{error}</Banner>
          </div>
        )}
      </Card>

      {desafios === null && <Skeleton className="h-24" />}
      {desafios?.length === 0 && <EmptyState title="Nenhum desafio criado ainda" />}

      {desafios?.map((d) => {
        const ranking = rankings[d.id];
        return (
          <Card key={d.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{d.titulo}</p>
                <p className="text-xs text-ink-muted">
                  {new Date(d.inicio).toLocaleDateString("pt-BR")} — {new Date(d.fim).toLocaleDateString("pt-BR")} ·{" "}
                  {d.participantes.length} participante(s)
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => verRanking(d.id)}>
                {ranking ? "Atualizar ranking" : "Ver ranking"}
              </Button>
            </div>

            {ranking && (
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                {ranking.ranking.map((r, i) => (
                  <div key={r.alunoId} className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      #{i + 1} {r.nome}
                    </span>
                    <span className="font-semibold tabular-nums text-accent">{r.volume} kg</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
