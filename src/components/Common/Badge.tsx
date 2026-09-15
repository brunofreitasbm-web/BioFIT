"use client";

import React from "react";

export type MuscleGroup =
  | "Quadríceps"
  | "Posterior"
  | "Peito"
  | "Costas"
  | "Deltoides"
  | "Bíceps"
  | "Tríceps"
  | "Panturrilha"
  | "Postura"
  | "Core"
  | string;

export interface BadgeProps {
  category: MuscleGroup;
  variant?: "primary" | "secondary" | "default";
  children?: React.ReactNode;
  className?: string;
}

const MUSCLE_GROUP_CLASSES: Record<string, string> = {
  // WCAG AA Compliant palette (> 4.5:1 contrast)
  "Quadríceps": "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]", // Sky-100 / Sky-700 / Sky-200 (~5.8:1)
  Posterior: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]", // Violet-100 / Violet-700 / Violet-200 (~6.1:1)
  Peito: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]", // Red-100 / Red-700 (~5.6:1)
  Costas: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]", // Amber-100 / Amber-700 (~5.2:1)
  Deltoides: "bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]", // Emerald-100 / Emerald-700 (~5.4:1)
  "Bíceps": "bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]", // Cyan-100 / Cyan-700 (~5.3:1)
  "Tríceps": "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]", // Indigo-100 / Indigo-700 (~6.2:1)
  Panturrilha: "bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]", // Teal-100 / Teal-700 (~5.5:1)
  Postura: "bg-[#FAE8FF] text-[#A21CAF] border-[#F5D0FE]", // Fuchsia-100 / Fuchsia-700 (~5.7:1)
  Core: "bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]", // Rose-100 / Rose-700 (~5.8:1)
};

export function Badge({ category, variant = "default", children, className = "" }: BadgeProps) {
  let colorClasses = MUSCLE_GROUP_CLASSES[category];

  if (!colorClasses) {
    if (variant === "primary") {
      colorClasses = MUSCLE_GROUP_CLASSES["Quadríceps"];
    } else if (variant === "secondary") {
      colorClasses = MUSCLE_GROUP_CLASSES["Posterior"];
    } else {
      colorClasses = "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
    }
  }

  return (
    <span
      role="status"
      aria-label={`Grupo muscular: ${category}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs ${colorClasses} ${className}`}
    >
      {children || category}
    </span>
  );
}
