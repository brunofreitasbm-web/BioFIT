"use client";

import React from "react";

export interface ExerciseSetRowProps {
  setNumber: number;
  weight: string | number;
  reps: string | number;
  previousWeight?: string | number | null;
  previousReps?: string | number | null;
  isCompleted?: boolean;
  isSubmitting?: boolean;
  onConfirm: (weight: number, reps: number) => void;
  onChange?: (weight: string, reps: string) => void;
}

export function ExerciseSetRow({
  setNumber,
  weight,
  reps,
  previousWeight,
  previousReps,
  isCompleted = false,
  isSubmitting = false,
  onConfirm,
  onChange,
}: ExerciseSetRowProps) {
  const weightStr = weight !== undefined && weight !== null ? String(weight) : "";
  const repsStr = reps !== undefined && reps !== null ? String(reps) : "";

  const weightNum = Number(weightStr);
  const repsNum = Number(repsStr);

  const isValid =
    weightStr.trim() !== "" &&
    repsStr.trim() !== "" &&
    !isNaN(weightNum) &&
    weightNum > 0 &&
    !isNaN(repsNum) &&
    repsNum > 0;

  const isDisabled = !isValid || isSubmitting;

  const weightPlaceholder = previousWeight != null ? `${previousWeight}` : "kg";
  const repsPlaceholder = previousReps != null ? `${previousReps}` : "reps";

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(val, repsStr);
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(weightStr, val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDisabled) {
      onConfirm(weightNum, repsNum);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-2 gap-y-1.5 text-xs">
      <span className="font-medium text-slate-400 dark:text-slate-400">{setNumber}</span>

      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="999"
          step="0.5"
          placeholder={weightPlaceholder}
          aria-label={`Carga em quilos, série ${setNumber}`}
          value={weightStr}
          onChange={handleWeightChange}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="999"
          step="1"
          placeholder={repsPlaceholder}
          aria-label={`Repetições, série ${setNumber}`}
          value={repsStr}
          onChange={handleRepsChange}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-all duration-150 ${
          isDisabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-600"
            : isCompleted
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 dark:border-blue-500 dark:bg-blue-600"
        }`}
        aria-label={`Confirmar série ${setNumber}`}
      >
        <span aria-hidden="true">✓</span>
      </button>
    </form>
  );
}
