"use client";

import { useEffect, useMemo, useState } from "react";
import { GRUPOS_MUSCULARES, type GrupoMuscular } from "@biofit/shared";
import { api } from "@/lib/api";
import { youtubeThumbnail } from "@/lib/youtube";
import { buscarExerciseDb, type ExerciseDbEntry, exerciseDbImageUrl } from "@/lib/exercisedb";
import { Banner, Button, Card, EmptyState, GrupoBadge, Input, Select, Skeleton } from "@/components/ui";

interface Exercicio {
  id: string;
  nome: string;
  grupoMuscular: string;
  midiaUrl: string | null;
  videoUrl: string | null;
}

export default function ExerciciosPage() {
  const [exercicios, setExercicios] = useState<Exercicio[] | null>(null);
  const [nome, setNome] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState<GrupoMuscular>("PEITO");
  const [videoUrl, setVideoUrl] = useState("");
  const [buscaImagem, setBuscaImagem] = useState("");
  const [resultadosImagem, setResultadosImagem] = useState<ExerciseDbEntry[]>([]);
  const [midiaUrl, setMidiaUrl] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<GrupoMuscular | "TODOS">("TODOS");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const termo = buscaImagem.trim();
    if (termo.length < 2) {
      setResultadosImagem([]);
      return;
    }
    const timeout = setTimeout(() => {
      buscarExerciseDb(termo).then(setResultadosImagem).catch(() => setResultadosImagem([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscaImagem]);

  async function load() {
    setExercicios(await api<Exercicio[]>("/exercicios"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/exercicios", {
        method: "POST",
        body: { nome, grupoMuscular, videoUrl: videoUrl || undefined, midiaUrl: midiaUrl ?? undefined },
      });
      setNome("");
      setVideoUrl("");
      setBuscaImagem("");
      setResultadosImagem([]);
      setMidiaUrl(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api(`/exercicios/${id}`, { method: "DELETE" });
    await load();
  }

  const filtrados = useMemo(
    () => (exercicios ?? []).filter((ex) => filtro === "TODOS" || ex.grupoMuscular === filtro),
    [exercicios, filtro],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Biblioteca de exercícios</h1>
        <p className="text-sm text-ink-muted">Sua base de exercícios reutilizável ao montar fichas</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <Input
            label="Nome do exercício"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="flex-1"
          />
          <Select
            label="Grupo muscular"
            value={grupoMuscular}
            onChange={(e) => setGrupoMuscular(e.target.value as GrupoMuscular)}
          >
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g} value={g}>
                {g.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Input
            label="Vídeo do YouTube (opcional)"
            placeholder="https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={saving}>
            Adicionar
          </Button>
        </form>

        <div className="mt-3 flex items-start gap-3">
          {midiaUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-base-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={midiaUrl} alt="Imagem selecionada" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setMidiaUrl(null)}
                className="absolute right-0 top-0 rounded-bl bg-base-900/80 px-1 text-[10px] text-ink"
                aria-label="Remover imagem selecionada"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-ink-faint">
              Sem imagem
            </div>
          )}
          <div className="flex-1">
            <Input
              label="Buscar imagem no ExerciseDB (opcional)"
              placeholder="ex.: bench press, squat, curl..."
              value={buscaImagem}
              onChange={(e) => setBuscaImagem(e.target.value)}
            />
            {resultadosImagem.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {resultadosImagem.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setMidiaUrl(exerciseDbImageUrl(r.id));
                      setBuscaImagem("");
                      setResultadosImagem([]);
                    }}
                    title={r.name}
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-base-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={exerciseDbImageUrl(r.id)} alt={r.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3">
            <Banner variant="error">{error}</Banner>
          </div>
        )}
      </Card>

      {exercicios !== null && exercicios.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro("TODOS")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === "TODOS" ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            Todos
          </button>
          {GRUPOS_MUSCULARES.filter((g) => exercicios.some((ex) => ex.grupoMuscular === g)).map((g) => (
            <button
              key={g}
              onClick={() => setFiltro(g)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filtro === g ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {g.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {exercicios === null && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {exercicios?.length === 0 && (
        <EmptyState
          title="Nenhum exercício cadastrado ainda"
          description="Cadastre exercícios aqui para poder montar fichas de treino para seus alunos."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((ex) => {
          const imagem = ex.midiaUrl ?? (ex.videoUrl ? youtubeThumbnail(ex.videoUrl) : null);
          return (
            <Card key={ex.id} className="overflow-hidden p-0">
              {imagem ? (
                ex.videoUrl ? (
                  <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagem} alt={ex.nome} className="aspect-video w-full object-cover" />
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt={ex.nome} className="aspect-video w-full object-cover" />
                )
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-base-700 text-xs text-ink-faint">
                  Sem imagem
                </div>
              )}
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ex.nome}</span>
                  <GrupoBadge grupo={ex.grupoMuscular} />
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(ex.id)}>
                  Remover
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
