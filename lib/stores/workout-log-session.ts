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
  /** Clear state after successful save - call from form on save success */
  clearSession: () => void
}

const initialState: WorkoutLogSessionState = {
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

      clearSession: () => set(initialState),
    }),
    {
      name: "fitforge-workout-log-session",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
