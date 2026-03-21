"use server"

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

export async function saveWorkoutLog(input: SaveWorkoutLogInput) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) throw new Error(authError?.message || "Not authenticated")

  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: user.id,
      plan_id: input.planId,
      workout_day: input.workoutDay,
      exercises: input.exercises,
      duration_min: input.durationMin,
      difficulty_rating: input.difficultyRating || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || "Failed to save workout log")

  if (input.planId && input.difficultyRating) {
    const { error: planUpdateError } = await supabase
      .from("workout_plans")
      .update({ difficulty_rating: input.difficultyRating })
      .eq("id", input.planId)

    if (planUpdateError) throw new Error(planUpdateError.message || "Failed to update workout plan")
  }

  updateTag("dashboard")
  updateTag("progress")
  updateTag("workout-logs")
  updateTag("plan")

  return data
}

export async function deleteWorkoutLog(logId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) throw new Error(authError?.message || "Not authenticated")

  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message || "Failed to delete workout log")

  updateTag("dashboard")
  updateTag("progress")
  updateTag("workout-logs")
}
