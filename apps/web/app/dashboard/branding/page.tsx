"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, Input, Banner } from "@/components/ui";

interface BrandingData {
  brandColor: string;
  brandAccent: string;
  brandName: string;
}

export default function BrandingPage() {
  const [brandColor, setBrandColor] = useState("#4f7cff");
  const [brandAccent, setBrandAccent] = useState("#a6ff3f");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ branding: BrandingData }>("/me")
      .then((res) => {
        if (res.branding) {
          setBrandColor(res.branding.brandColor || "#4f7cff");
          setBrandAccent(res.branding.brandAccent || "#a6ff3f");
          setBrandName(res.branding.brandName || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await api("/branding", {
        method: "PUT",
        body: { brandColor, brandAccent, brandName },
      });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Personalização de Branding</h1>
        <p className="text-sm text-ink-muted">Configure a identidade visual da sua marca para seus alunos</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Nome da Marca / Personal Trainer"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Ex: Pedro Personal"
              required
            />

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-ink-muted">Cor da Marca (Primária)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-full rounded-lg border border-line bg-base-800 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-ink-muted">Cor de Destaque (Acento)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandAccent}
                    onChange={(e) => setBrandAccent(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={brandAccent}
                    onChange={(e) => setBrandAccent(e.target.value)}
                    className="w-full rounded-lg border border-line bg-base-800 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" loading={saving} className="mt-2">
              Salvar Alterações
            </Button>
          </form>

          {success && (
            <div className="mt-4">
              <Banner variant="success">Branding atualizado com sucesso!</Banner>
            </div>
          )}
          {error && (
            <div className="mt-4">
              <Banner variant="error">{error}</Banner>
            </div>
          )}
        </Card>

        {/* Live Preview Card */}
        <Card className="flex flex-col gap-6 p-6">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink-muted">Visualização no App do Aluno</h2>
            <p className="text-xs text-ink-faint">Prévia em tempo real de como o aluno verá seu tema</p>
          </div>

          <div
            className="flex flex-col rounded-2xl border border-line p-4 text-ink shadow-2xl"
            style={{ backgroundColor: "#0f1115" }}
          >
            {/* Header Simulator */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderBottomColor: "#2c313c" }}>
              <span className="text-sm font-black" style={{ color: "#e6e8eb" }}>
                {brandName || "Seu Nome/Marca"}
              </span>
              <div
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: brandAccent + "20", color: brandAccent, borderColor: brandAccent, borderWidth: 1 }}
              >
                🔥 5 Dias Seguidos
              </div>
            </div>

            {/* Content Simulator */}
            <div className="py-4">
              <div
                className="mb-3 rounded-xl border p-3"
                style={{ backgroundColor: "#171a20", borderColor: "#2c313c" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: brandAccent }}>
                    Treino de Pernas e Glúteos
                  </span>
                  <span className="text-[10px]" style={{ color: "#5f6675" }}>
                    4x · descanso 60s
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderTopColor: "#2c313c" }}>
                  <div>
                    <span className="block text-xs font-medium" style={{ color: "#e6e8eb" }}>
                      Leg Press 45º
                    </span>
                    <span className="text-[10px]" style={{ color: "#9aa0ac" }}>
                      10-12 reps · 270kg
                    </span>
                  </div>
                  <div
                    className="rounded-lg px-2.5 py-1 text-[10px] font-bold"
                    style={{ backgroundColor: brandAccent, color: "#0a0b0f" }}
                  >
                    Quick ✓
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Bar Simulator */}
            <div className="flex justify-around border-t pt-2" style={{ borderTopColor: "#2c313c" }}>
              <div className="flex flex-col items-center">
                <span className="text-sm">🏋</span>
                <span className="text-[9px]" style={{ color: brandColor }}>
                  Treino
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm">📈</span>
                <span className="text-[9px]" style={{ color: "#9aa0ac" }}>
                  Progresso
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm">👤</span>
                <span className="text-[9px]" style={{ color: "#9aa0ac" }}>
                  Perfil
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
