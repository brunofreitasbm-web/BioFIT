"use client";

import { BatteryCharging, Moon, Heart, Activity, Watch, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

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
}

export function GarminCard({ biometria, carregando }: GarminCardProps) {
  if (!biometria && !carregando) {
    return null; // Não exibe se ainda não sincronizou
  }

  if (carregando) {
    return (
      <div className="mb-4 rounded-xl border border-line bg-base-800 p-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-base-700 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 rounded bg-base-700" />
          <div className="h-12 rounded bg-base-700" />
          <div className="h-12 rounded bg-base-700" />
        </div>
      </div>
    );
  }

  const bb = biometria?.bodyBattery;
  const sono = biometria?.sonoHoras;
  const hrv = biometria?.hrvStatus || (biometria?.hrvMs ? `${biometria.hrvMs}ms` : null);
  const fc = biometria?.fcRepouso;

  return (
    <div className="mb-4 rounded-xl border border-line bg-base-800/90 p-3 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Watch size={15} className="text-brand" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">
            Recuperação Garmin
          </span>
        </div>
        <span className="text-[11px] text-ink-faint">
          {biometria?.data ? `Referência: ${biometria.data}` : "Hoje"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Body Battery */}
        <div className="rounded-lg border border-line/60 bg-base-900/60 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-ink-muted mb-0.5">
            <BatteryCharging size={13} className="text-accent" />
            <span>Body Battery</span>
          </div>
          <span
            className={cn(
              "font-display text-base font-bold",
              bb && bb >= 70 ? "text-accent" : bb && bb >= 40 ? "text-brand" : "text-danger",
            )}
          >
            {bb != null ? bb : "—"}
            <span className="text-[10px] text-ink-faint font-normal">/100</span>
          </span>
        </div>

        {/* Sono */}
        <div className="rounded-lg border border-line/60 bg-base-900/60 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-ink-muted mb-0.5">
            <Moon size={13} className="text-brand" />
            <span>Sono</span>
          </div>
          <span className="font-display text-base font-bold text-ink">
            {sono != null ? `${sono}h` : "—"}
          </span>
          {biometria?.sonoScore != null && (
            <span className="block text-[10px] text-ink-faint">Score {biometria.sonoScore}</span>
          )}
        </div>

        {/* VFC / HRV */}
        <div className="rounded-lg border border-line/60 bg-base-900/60 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-ink-muted mb-0.5">
            <Activity size={13} className="text-accent" />
            <span>VFC (HRV)</span>
          </div>
          <span className="font-display text-xs font-bold text-ink capitalize truncate block">
            {hrv ?? (fc ? `${fc} bpm` : "—")}
          </span>
          {biometria?.hrvMs != null && (
            <span className="block text-[10px] text-ink-faint">{biometria.hrvMs} ms</span>
          )}
        </div>
      </div>
    </div>
  );
}
