"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { LoggedSet } from "@/lib/types"

export interface WorkoutLogSessionState {
  /** Plan ID + workout day for session identity - restore only when matching */
  planId: string | null
  workoutDayName: string | null
  exerciseSets: Record<string, LoggedSet[]>
  difficulty: number
  notes: string
  /** Whether the persisted state has been rehydrated from localStorage */
  _hasHydrated: boolean
}

interface WorkoutLogSessionActions {
  /** Initialize or update session for current workout context */
  initSession: (params: {
    planId: string
    workoutDayName: string
    exerciseSets: Record<string, LoggedSet[]>
    difficulty?: number
    notes?: string
  }) => void
  setExerciseSets: (sets: Record<string, LoggedSet[]>) => void
  updateExerciseSets: (exerciseName: string, sets: LoggedSet[]) => void
  setDifficulty: (difficulty: number) => void
  setNotes: (notes: string) => void
  /** Clear form data after successful save, keeping identity so the effect doesn't re-init mid-navigate */
  clearSession: () => void
  /** Mark hydration as complete — called by persist onRehydrateStorage */
  setHasHydrated: (v: boolean) => void
}

const initialState: Omit<WorkoutLogSessionState, "_hasHydrated"> = {
  planId: null,
  workoutDayName: null,
  exerciseSets: {},
  difficulty: 0,
  notes: "",
}

export const useWorkoutLogSessionStore = create<WorkoutLogSessionState & WorkoutLogSessionActions>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      initSession: ({ planId, workoutDayName, exerciseSets, difficulty = 0, notes = "" }) =>
        set({
          planId,
          workoutDayName,
          exerciseSets,
          difficulty,
          notes,
        }),

      setExerciseSets: (exerciseSets) => set({ exerciseSets }),

      updateExerciseSets: (exerciseName, sets) =>
        set((state) => ({
          exerciseSets: { ...state.exerciseSets, [exerciseName]: sets },
        })),

      setDifficulty: (difficulty) => set({ difficulty }),

      setNotes: (notes) => set({ notes }),

      clearSession: () =>
        set({
          exerciseSets: {},
          difficulty: 0,
          notes: "",
          // Keep planId & workoutDayName so the hydration effect doesn't
          // see a mismatch and re-init before navigation completes
        }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "fitforge-workout-log-session",
      storage: createJSONStorage(() => localStorage),
      // Exclude transient fields from persistence
      partialize: (state) => ({
        planId: state.planId,
        workoutDayName: state.workoutDayName,
        exerciseSets: state.exerciseSets,
        difficulty: state.difficulty,
        notes: state.notes,
      }),
      onRehydrateStorage: () => (state) => {
        // Called once after persist restores from localStorage
        state?.setHasHydrated(true)
      },
    }
  )
)
