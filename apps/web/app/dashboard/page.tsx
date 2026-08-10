"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { OBJETIVOS, OBJETIVO_LABELS, type Objetivo } from "@biofit/shared";
import { Avatar, Badge, Banner, Button, Card, EmptyState, Input, Select, Skeleton } from "@/components/ui";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  objetivo: Objetivo | null;
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [objetivo, setObjetivo] = useState<Objetivo | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setAlunos(await api<Aluno[]>("/alunos"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/alunos", { method: "POST", body: { nome, email, senha, objetivo: objetivo || undefined } });
      setNome("");
      setEmail("");
      setSenha("");
      setObjetivo("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Alunos</h1>
          <p className="text-sm text-ink-muted">Gerencie os alunos vinculados a você</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "+ Novo aluno"}</Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="flex-1" />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Input
              label="Senha inicial"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
              className="flex-1"
            />
            <Select label="Objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value as Objetivo)} className="w-52">
              <option value="">Não definido</option>
              {OBJETIVOS.map((o) => (
                <option key={o} value={o}>
                  {OBJETIVO_LABELS[o]}
                </option>
              ))}
            </Select>
            <Button type="submit" loading={saving}>
              Adicionar
            </Button>
          </form>
          {error && (
            <div className="mt-3">
              <Banner variant="error">{error}</Banner>
            </div>
          )}
        </Card>
      )}

      {alunos === null && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {alunos?.length === 0 && (
        <EmptyState
          title="Nenhum aluno cadastrado ainda"
          description="Adicione seu primeiro aluno para começar a montar fichas de treino."
          action={<Button onClick={() => setShowForm(true)}>+ Novo aluno</Button>}
        />
      )}

      <div className="flex flex-col gap-2">
        {alunos?.map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={a.nome} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{a.nome}</p>
                  {a.objetivo && <Badge>{OBJETIVO_LABELS[a.objetivo]}</Badge>}
                </div>
                <p className="text-xs text-ink-muted">{a.email}</p>
              </div>
            </div>
            <Link href={`/dashboard/alunos/${a.id}`}>
              <Button variant="secondary" size="sm">
                Ver fichas
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
