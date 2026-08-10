"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Button, Card, Input, Banner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("personal@biofit.dev");
  const [senha, setSenha] = useState("senha123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: { role: string } }>("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      if (res.user.role !== "PERSONAL") {
        throw new Error("Este painel é exclusivo para personal trainers");
      }
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,theme(colors.base.800),theme(colors.base.950))] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-lg font-black text-base-950">
            B
          </div>
          <h1 className="text-xl font-semibold tracking-tight">BioFIT</h1>
          <p className="text-sm text-ink-muted">Painel do personal trainer</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error && <Banner variant="error">{error}</Banner>}
            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-ink-faint">Demo: personal@biofit.dev / senha123</p>
      </div>
    </div>
  );
}
