"use server"

import { appendFileSync } from "node:fs"
import { updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { LoggedExercise } from "@/lib/types"

interface SaveWorkoutLogInput {
  planId: string | null
  workoutDay: string
  exercises: LoggedExercise[]
  durationMin: number | null
  difficultyRating: number
  notes: string
}

function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  try {
    appendFileSync(
      "/opt/cursor/logs/debug.log",
      JSON.stringify({ hypothesisId, location, message, data, timestamp: Date.now() }) + "\n"
    )
  } catch {}
}

export async function saveWorkoutLog(input: SaveWorkoutLogInput) {
  // #region agent log
  debugLog("B", "app/actions/workout-log.ts:30", "saveWorkoutLog entry", {
    hasPlanId: Boolean(input.planId),
    workoutDay: input.workoutDay,
    exerciseCount: input.exercises.length,
    completedSetCount: input.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
      0
    ),
    difficultyRating: input.difficultyRating,
    durationMin: input.durationMin,
    hasNotes: Boolean(input.notes.trim()),
  })
  // #endregion

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // #region agent log
    debugLog("A", "app/actions/workout-log.ts:47", "auth lookup complete", {
      hasUser: Boolean(user),
      authErrorMessage: authError?.message ?? null,
      authErrorStatus: authError?.status ?? null,
    })
    // #endregion

    if (!user) throw new Error(authError?.message || "Not authenticated")

    const insertPayload = {
      user_id: user.id,
      plan_id: input.planId,
      workout_day: input.workoutDay,
      exercises: input.exercises,
      duration_min: input.durationMin,
      difficulty_rating: input.difficultyRating || null,
      notes: input.notes || null,
    }

    // #region agent log
    debugLog("B", "app/actions/workout-log.ts:66", "normalized insert payload", {
      planId: insertPayload.plan_id,
      workoutDay: insertPayload.workout_day,
      exerciseCount: insertPayload.exercises.length,
      setCounts: insertPayload.exercises.map((exercise) => exercise.sets.length),
      difficultyRating: insertPayload.difficulty_rating,
      notesLength: insertPayload.notes?.length ?? 0,
    })
    // #endregion

    const { data, error } = await supabase
      .from("workout_logs")
      .insert(insertPayload)
      .select()
      .single()

    // #region agent log
    debugLog("C", "app/actions/workout-log.ts:81", "insert finished", {
      insertedId: data?.id ?? null,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      errorDetails: error?.details ?? null,
      errorHint: error?.hint ?? null,
    })
    // #endregion

    if (error) throw new Error(error.message)

    let planUpdateErrorMessage: string | null = null
    if (input.planId && input.difficultyRating) {
      const { error: planUpdateError } = await supabase
        .from("workout_plans")
        .update({ difficulty_rating: input.difficultyRating })
        .eq("id", input.planId)

      planUpdateErrorMessage = planUpdateError?.message ?? null
    }

    // #region agent log
    debugLog("E", "app/actions/workout-log.ts:101", "plan update branch complete", {
      attemptedPlanUpdate: Boolean(input.planId && input.difficultyRating),
      difficultyRating: input.difficultyRating,
      planUpdateErrorMessage,
    })
    // #endregion

    if (planUpdateErrorMessage) throw new Error(planUpdateErrorMessage)

    updateTag("dashboard")
    updateTag("progress")
    updateTag("workout-logs")
    updateTag("plan")

    // #region agent log
    debugLog("D", "app/actions/workout-log.ts:112", "cache invalidation complete", {
      insertedId: data?.id ?? null,
    })
    // #endregion

    return data
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))

    // #region agent log
    debugLog("D", "app/actions/workout-log.ts:121", "saveWorkoutLog threw", {
      errorName: err.name,
      errorMessage: err.message,
      errorStackFirstLine: err.stack?.split("\n")[0] ?? null,
    })
    // #endregion

    throw err
  }
}
