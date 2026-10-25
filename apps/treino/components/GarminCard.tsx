"use client";

import { Activity, AlertTriangle, BatteryCharging, CheckCircle2, Heart, Info, Moon, Watch } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import { nivelBodyBattery, nivelSono, nivelTendencia, nivelVfc, VFC_MIN_BASE, type AvaliacaoVfc, type DiaGarmin, type NivelMetrica, type Prontidao } from "@/lib/prontidao";

export interface GarminBiometria {
  data: string;
  bodyBattery: number | null;
  sonoMinutos: number | null;
  sonoHoras: number | null;
  sonoScore: number | null;
  hrvStatus: string | null;
  hrvMs: number | null;
  stress: number | null;
  fcRepouso: number | null;
  passos: number | null;
}

interface GarminCardProps {
  biometria: GarminBiometria | null;
  carregando?: boolean;
  prontidao?: Prontidao | null;
  dias?: DiaGarmin[];
  hojeISO?: string;
  vfc?: AvaliacaoVfc | null;
}

// Cor + texto: o nível nunca depende só da cor (daltonismo, sol na academia).
const NIVEL_COR: Record<NivelMetrica, string> = {
  bom: "text-accent",
  atencao: "text-brand",
  alerta: "text-danger",
  sem_dado: "text-ink-faint",
};
const NIVEL_ROTULO: Record<NivelMetrica, string> = { bom: "ok", atencao: "atenção", alerta: "baixo", sem_dado: "sem dado" };
const NIVEL_PONTO: Record<NivelMetrica, string> = {
  bom: "bg-accent",
  atencao: "bg-brand",
  alerta: "bg-danger",
  sem_dado: "bg-line",
};

const SELO = {
  normal: { Icone: CheckCircle2, texto: "Recuperação ok", cor: "text-accent", fundo: "bg-accent/10 border-accent/30" },
  atencao: { Icone: AlertTriangle, texto: "Recuperação: atenção", cor: "text-brand", fundo: "bg-brand-soft border-brand/30" },
  baixa: { Icone: AlertTriangle, texto: "Recuperação baixa", cor: "text-danger", fundo: "bg-danger-soft border-danger/30" },
  sem_dados: { Icone: Info, texto: "Sem dados de hoje", cor: "text-ink-faint", fundo: "bg-base-900/60 border-line" },
} as const;

function Metrica({ rotulo, Icone, valor, detalhe, nivel: nivelReal, antigo }: { rotulo: string; Icone: typeof Moon; valor: string; detalhe?: string | null; nivel: NivelMetrica; antigo?: boolean }) {
  // Dado de outro dia não vira alerta de hoje: fica neutro e rotulado.
  const nivel: NivelMetrica = antigo ? "sem_dado" : nivelReal;
  return (
    <div className="relative rounded-lg border border-line/60 bg-base-900/60 p-2 text-center" aria-label={`${rotulo}: ${valor}, ${NIVEL_ROTULO[nivel]}`}>
      <span aria-hidden="true" className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", NIVEL_PONTO[nivel])} />
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[11px] text-ink-muted">
        <Icone aria-hidden="true" size={ICON.xs} className={NIVEL_COR[nivel]} />
        <span className="truncate">{rotulo}</span>
      </div>
      <span className={cn("block font-display text-sm font-bold", nivel === "sem_dado" ? "text-ink-faint" : "text-ink")}>{valor}</span>
      <span className={cn("block text-[10px]", NIVEL_COR[nivel])}>{detalhe ?? (antigo ? "dado antigo" : NIVEL_ROTULO[nivel])}</span>
    </div>
  );
}

function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function GarminCard({ biometria, carregando, prontidao, dias = [], hojeISO, vfc }: GarminCardProps) {
  if (!biometria && !carregando) {
    return null; // Não exibe se ainda não sincronizou
  }

  if (carregando) {
    return (
      <div className="mb-4 animate-pulse rounded-xl border vidro p-3">
        <div className="mb-2 h-4 w-32 rounded bg-base-700" />
        <div className="grid grid-cols-4 gap-1.5">
          <div className="h-14 rounded bg-base-700" />
          <div className="h-14 rounded bg-base-700" />
          <div className="h-14 rounded bg-base-700" />
          <div className="h-14 rounded bg-base-700" />
        </div>
      </div>
    );
  }

  const bb = biometria?.bodyBattery ?? null;
  const sono = biometria?.sonoHoras ?? null;
  const score = biometria?.sonoScore ?? null;
  const hrv = biometria?.hrvMs ?? null;
  const fc = biometria?.fcRepouso ?? null;
  const defasado = Boolean(hojeISO && biometria?.data && biometria.data !== hojeISO);
  const selo = prontidao ? SELO[prontidao.nivel] : null;
  const hoje = hojeISO ?? biometria?.data ?? "";

  return (
    <div className="mb-4 rounded-xl border vidro p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Watch aria-hidden="true" size={ICON.sm} className="text-brand" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">Recuperação Garmin</span>
        </div>
        <span className={cn("text-[11px]", defasado ? "font-semibold text-brand" : "text-ink-faint")}>
          {biometria?.data ? (defasado ? `Dado de ${dataCurta(biometria.data)}` : `Hoje · ${dataCurta(biometria.data)}`) : "Hoje"}
        </span>
      </div>

      {selo && prontidao && (
        <div className={cn("mb-2 flex items-start gap-2 rounded-lg border px-2.5 py-2", selo.fundo)} role="status">
          <selo.Icone aria-hidden="true" size={ICON.sm} className={cn("mt-0.5 shrink-0", selo.cor)} />
          <div className="min-w-0">
            <p className={cn("text-xs font-semibold", selo.cor)}>{selo.texto}</p>
            {prontidao.nivel !== "normal" && prontidao.motivos.length > 0 && (
              <p className="text-[11px] text-ink-muted">{prontidao.motivos.slice(0, 3).join(" · ")}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <Metrica rotulo="Battery" Icone={BatteryCharging} valor={bb !== null ? String(bb) : "—"} nivel={nivelBodyBattery(bb)} antigo={defasado} />
        <Metrica rotulo="Sono" Icone={Moon} valor={sono !== null ? `${sono}h` : "—"} detalhe={score !== null ? `score ${score}` : null} nivel={nivelSono(sono, score)} antigo={defasado} />
        <Metrica rotulo="VFC" Icone={Activity} valor={hrv !== null ? `${hrv}ms` : "—"} detalhe={vfc?.nivel === "sem_base" ? `base ${vfc.diasBase}/${VFC_MIN_BASE} d` : null} nivel={nivelVfc(vfc)} antigo={defasado} />
        <Metrica rotulo="FC rep." Icone={Heart} valor={fc !== null ? `${fc}` : "—"} nivel={hoje ? nivelTendencia(dias, hoje, "fcRepouso") : "sem_dado"} antigo={defasado} />
      </div>
      <p className="mt-1.5 text-[10px] text-ink-faint">A VFC compara a média de 7 dias com a sua base das semanas anteriores e só pesa na prontidão com histórico suficiente; a FC de repouso só informa.</p>
    </div>
  );
}
