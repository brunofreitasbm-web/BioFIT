"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface SetDraft {
  setNumber: number;
  weight: string;
  reps: string;
  completed?: boolean;
}

export interface WorkoutSessionDraft {
  workoutId: string;
  date: string;
  updatedAt: string;
  exercises: Record<string, SetDraft[]>;
  isFinished?: boolean;
}

/**
 * Custom Hook for auto-saving workout session state to localStorage with a 400ms debounce.
 * Automatically hydrates on mount and clears storage on explicit session completion.
 */
export function useWorkoutSession(
  workoutId: string,
  currentDate: string = new Date().toISOString().split("T")[0]
) {
  const [draft, setDraft] = useState<WorkoutSessionDraft | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `draft_session_${workoutId}`;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Initial Hydration from localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !workoutId) {
      setIsLoaded(true);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkoutSessionDraft;
        if (parsed && parsed.workoutId === workoutId && !parsed.isFinished) {
          setDraft(parsed);
        }
      }
    } catch (err) {
      console.error("Error hydrating workout session draft:", err);
    } finally {
      setIsLoaded(true);
    }
  }, [workoutId, storageKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 2. Debounced save handler (400ms)
  const saveDraftLocally = useCallback(
    (newDraft: WorkoutSessionDraft) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newDraft));
        } catch (e) {
          console.error("Error saving draft session to localStorage:", e);
        }
      }, 400);
    },
    [storageKey]
  );

  // Update draft for a specific exercise set
  const updateSetDraft = useCallback(
    (exerciseId: string, setNumber: number, weight: string, reps: string, completed: boolean = false) => {
      setDraft((prev) => {
        const currentExercises = prev?.exercises ? { ...prev.exercises } : {};
        const existingSets = currentExercises[exerciseId] ? [...currentExercises[exerciseId]] : [];

        const setIdx = existingSets.findIndex((s) => s.setNumber === setNumber);
        const setEntry: SetDraft = { setNumber, weight, reps, completed };

        if (setIdx >= 0) {
          existingSets[setIdx] = setEntry;
        } else {
          existingSets.push(setEntry);
        }

        currentExercises[exerciseId] = existingSets;

        const updatedDraft: WorkoutSessionDraft = {
          workoutId,
          date: prev?.date || currentDate,
          updatedAt: new Date().toISOString(),
          exercises: currentExercises,
          isFinished: false,
        };

        saveDraftLocally(updatedDraft);
        return updatedDraft;
      });
    },
    [workoutId, currentDate, saveDraftLocally]
  );

  // 3. Clear draft key on session completion
  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Error clearing workout session draft:", e);
    }
    setDraft(null);
  }, [storageKey]);

  const getSetDraft = useCallback(
    (exerciseId: string, setNumber: number): SetDraft | null => {
      return draft?.exercises?.[exerciseId]?.find((s) => s.setNumber === setNumber) || null;
    },
    [draft]
  );

  return {
    draft,
    isLoaded,
    updateSetDraft,
    clearDraft,
    getSetDraft,
  };
}
