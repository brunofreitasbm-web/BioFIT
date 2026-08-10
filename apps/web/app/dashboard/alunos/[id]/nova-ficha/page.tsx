"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OBJETIVO_LABELS, TIPOS_BLOCO, type Objetivo, type TipoBloco } from "@biofit/shared";
import { api } from "@/lib/api";
import { Banner, Button, Card, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Exercicio {
  id: string;
  nome: string;
  grupoMuscular: string;
}

interface Aluno {
  id: string;
  nome: string;
  objetivo: Objetivo | null;
}

interface SugestaoResponse {
  objetivo: Objetivo;
  blocos: {
    tipo: TipoBloco;
    nome: string | null;
    rounds: number;
    descansoSegundos: number;
    itens: { exercicioId: string; repeticoesAlvo: string; cargaKg: number | null }[];
  }[];
}

interface ItemForm {
  exercicioId: string;
  repeticoesAlvo: string;
  cargaKg: string;
}

interface BlocoForm {
  tipo: TipoBloco;
  nome: string;
  rounds: number;
  descansoSegundos: number;
  itens: ItemForm[];
}

function novoBloco(): BlocoForm {
  return { tipo: "SIMPLES", nome: "", rounds: 3, descansoSegundos: 60, itens: [] };
}

const TIPO_STYLE: Record<TipoBloco, { label: string; dot: string; border: string }> = {
  AQUECIMENTO: { label: "Aquecimento", dot: "bg-grupo-ombro", border: "border-l-grupo-ombro" },
  SIMPLES: { label: "Simples", dot: "bg-brand", border: "border-l-brand" },
  BI_SET: { label: "Bi-set", dot: "bg-grupo-costas", border: "border-l-grupo-costas" },
  TRI_SET: { label: "Tri-set", dot: "bg-grupo-biceps", border: "border-l-grupo-biceps" },
  CIRCUITO: { label: "Circuito", dot: "bg-accent", border: "border-l-accent" },
};

function repsEstimadas(repeticoesAlvo: string): number {
  const nums = repeticoesAlvo.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function NovaFichaPage() {
  const { id: alunoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [titulo, setTitulo] = useState("");
  const [semana, setSemana] = useState(1);
  const [blocos, setBlocos] = useState<BlocoForm[]>([novoBloco()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);

  useEffect(() => {
    api<Exercicio[]>("/exercicios").then(setExercicios);
    api<Aluno>(`/alunos/${alunoId}`).then(setAluno);
  }, [alunoId]);

  async function sugerirTreino() {
    if (!aluno?.objetivo) return;
    setSugerindo(true);
    setError(null);
    try {
      const sugestao = await api<SugestaoResponse>(`/objetivos/${aluno.objetivo}/sugestao`);
      setBlocos(
        sugestao.blocos.map((b) => ({
          tipo: b.tipo,
          nome: b.nome ?? "",
          rounds: b.rounds,
          descansoSegundos: b.descansoSegundos,
          itens: b.itens.map((it) => ({
            exercicioId: it.exercicioId,
            repeticoesAlvo: it.repeticoesAlvo,
            cargaKg: it.cargaKg != null ? String(it.cargaKg) : "",
          })),
        })),
      );
      if (!titulo) setTitulo(`Sugestão — ${OBJETIVO_LABELS[aluno.objetivo]}`);
      const novosExercicios = await api<Exercicio[]>("/exercicios");
      setExercicios(novosExercicios);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSugerindo(false);
    }
  }

  function updateBloco(i: number, patch: Partial<BlocoForm>) {
    setBlocos(blocos.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function addBloco() {
    setBlocos([...blocos, novoBloco()]);
  }

  function removeBloco(i: number) {
    setBlocos(blocos.filter((_, idx) => idx !== i));
  }

  function addItem(blocoIdx: number) {
    if (exercicios.length === 0) return;
    const bloco = blocos[blocoIdx];
    updateBloco(blocoIdx, {
      itens: [...bloco.itens, { exercicioId: exercicios[0].id, repeticoesAlvo: "8-12", cargaKg: "" }],
    });
  }

  function updateItem(blocoIdx: number, itemIdx: number, patch: Partial<ItemForm>) {
    const bloco = blocos[blocoIdx];
    const itens = bloco.itens.map((it, idx) => (idx === itemIdx ? { ...it, ...patch } : it));
    updateBloco(blocoIdx, { itens });
  }

  function removeItem(blocoIdx: number, itemIdx: number) {
    const bloco = blocos[blocoIdx];
    updateBloco(blocoIdx, { itens: bloco.itens.filter((_, idx) => idx !== itemIdx) });
  }

  const resumo = useMemo(() => {
    const totalExercicios = blocos.reduce((n, b) => n + b.itens.length, 0);
    const volumeEstimado = blocos.reduce(
      (vol, b) =>
        vol +
        b.itens.reduce((v, it) => v + (Number(it.cargaKg) || 0) * repsEstimadas(it.repeticoesAlvo) * b.rounds, 0),
      0,
    );
    return { totalBlocos: blocos.length, totalExercicios, volumeEstimado: Math.round(volumeEstimado) };
  }, [blocos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (blocos.some((b) => b.itens.length === 0)) {
      setError("Todo bloco precisa ter ao menos um exercício.");
      return;
    }
    setSaving(true);
    try {
      await api("/fichas", {
        method: "POST",
        body: {
          alunoId,
          titulo,
          semana,
          ativa: true,
          blocos: blocos.map((b, ordem) => ({
            tipo: b.tipo,
            nome: b.nome || undefined,
            ordem,
            rounds: b.rounds,
            descansoSegundos: b.descansoSegundos,
            itens: b.itens.map((it, iOrdem) => ({
              exercicioId: it.exercicioId,
              ordem: iOrdem,
              repeticoesAlvo: it.repeticoesAlvo,
              cargaKg: it.cargaKg ? Number(it.cargaKg) : undefined,
            })),
          })),
        },
      });
      router.push(`/dashboard/alunos/${alunoId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Nova ficha</h1>
            <p className="text-sm text-ink-muted">
              Monte a ficha em blocos de treino
              {aluno?.objetivo && ` · objetivo: ${OBJETIVO_LABELS[aluno.objetivo]}`}
            </p>
          </div>
          {aluno?.objetivo && (
            <Button type="button" variant="secondary" onClick={sugerirTreino} loading={sugerindo}>
              Sugerir treino para o objetivo
            </Button>
          )}
        </div>

        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <Input
            label="Título"
            placeholder="Ex: Peito/Tríceps"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            label="Semana"
            type="number"
            min={1}
            value={semana}
            onChange={(e) => setSemana(Number(e.target.value))}
            className="w-24"
          />
        </Card>

        {blocos.map((bloco, bi) => {
          const style = TIPO_STYLE[bloco.tipo];
          return (
            <Card key={bi} className={cn("border-l-4 p-4", style.border)}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Select
                    label="Tipo"
                    value={bloco.tipo}
                    onChange={(e) => updateBloco(bi, { tipo: e.target.value as TipoBloco })}
                    className="w-36"
                  >
                    {TIPOS_BLOCO.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_STYLE[t].label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Nome (opcional)"
                    placeholder="Ex: Bi-set peito"
                    value={bloco.nome}
                    onChange={(e) => updateBloco(bi, { nome: e.target.value })}
                    className="w-44"
                  />
                  <Input
                    label="Rounds"
                    type="number"
                    min={1}
                    value={bloco.rounds}
                    onChange={(e) => updateBloco(bi, { rounds: Number(e.target.value) })}
                    className="w-20"
                  />
                  <Input
                    label="Descanso (s)"
                    type="number"
                    min={0}
                    value={bloco.descansoSegundos}
                    onChange={(e) => updateBloco(bi, { descansoSegundos: Number(e.target.value) })}
                    className="w-24"
                  />
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeBloco(bi)}>
                  Remover bloco
                </Button>
              </div>

              {bloco.itens.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
                  {bloco.itens.map((item, ii) => (
                    <div key={ii} className="flex flex-wrap items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
                      <select
                        className="min-w-[140px] flex-1 rounded-lg border border-line bg-base-900 px-2 py-1.5 text-sm"
                        value={item.exercicioId}
                        onChange={(e) => updateItem(bi, ii, { exercicioId: e.target.value })}
                      >
                        {exercicios.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Reps (8-12)"
                        value={item.repeticoesAlvo}
                        onChange={(e) => updateItem(bi, ii, { repeticoesAlvo: e.target.value })}
                        className="w-24 rounded-lg border border-line bg-base-900 px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Carga (kg)"
                        type="number"
                        value={item.cargaKg}
                        onChange={(e) => updateItem(bi, ii, { cargaKg: e.target.value })}
                        className="w-24 rounded-lg border border-line bg-base-900 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(bi, ii)}
                        className="rounded-lg px-2 py-1.5 text-xs text-ink-faint hover:bg-danger-soft hover:text-danger"
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addItem(bi)}
                  disabled={exercicios.length === 0}
                >
                  + Exercício
                </Button>
              </div>
            </Card>
          );
        })}

        <Button type="button" variant="secondary" onClick={addBloco} className="self-start">
          + Bloco de treino
        </Button>

        {error && <Banner variant="error">{error}</Banner>}
        {exercicios.length === 0 && (
          <Banner variant="info">Cadastre exercícios na biblioteca antes de montar uma ficha.</Banner>
        )}

        <div>
          <Button type="submit" loading={saving}>
            Salvar ficha
          </Button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-20 lg:w-64 lg:shrink-0">
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Resumo da ficha</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Blocos</span>
            <span className="font-semibold tabular-nums">{resumo.totalBlocos}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Exercícios</span>
            <span className="font-semibold tabular-nums">{resumo.totalExercicios}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Volume estimado</span>
            <span className="font-semibold tabular-nums text-accent">{resumo.volumeEstimado} kg</span>
          </div>
          <p className="text-[11px] text-ink-faint">
            Volume = carga × repetições médias × rounds, somado entre todos os blocos.
          </p>
        </Card>
      </aside>
    </div>
  );
}
