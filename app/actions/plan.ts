"use server"

import { updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { WorkoutPlanOutput } from "@/lib/schemas"

interface SavePlanInput {
  goalId?: string | null
  planOutput: WorkoutPlanOutput
  weekNumber?: number
}

interface UpdatePlanInput {
  planId: string
  planOutput: WorkoutPlanOutput
}

export async function savePlan({ goalId, planOutput, weekNumber = 1 }: SavePlanInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Deactivate existing plans
  await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)

  // Insert new plan
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: user.id,
      goal_id: goalId ?? null,
      name: planOutput.name,
      description: planOutput.description,
      plan_data: { days: planOutput.days },
      week_number: weekNumber,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Immediate invalidation so the redirected dashboard sees the new plan
  updateTag("plan")
  updateTag("workout-plans")
  updateTag("dashboard")

  return data
}

export async function updatePlan({ planId, planOutput }: UpdatePlanInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("workout_plans")
    .update({
      name: planOutput.name,
      description: planOutput.description,
      plan_data: { days: planOutput.days },
    })
    .eq("id", planId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  updateTag("plan")
  updateTag("workout-plans")
  updateTag("dashboard")

  return data
}

export async function saveGoal(goalData: {
  goal_type: string
  target_weight_kg?: number
  days_per_week: number
  session_duration_min: number
  equipment_access: string[]
  focus_areas: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Deactivate existing goals
  await supabase
    .from("fitness_goals")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)

  const { data, error } = await supabase
    .from("fitness_goals")
    .insert({
      user_id: user.id,
      ...goalData,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Immediate invalidation
  updateTag("plan")
  updateTag("fitness-goals")

  return data
}

export async function saveInitialMetrics(metricsData: {
  weight_kg: number
  height_cm?: number
  experience_level: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Save body metric
  await supabase.from("body_metrics").insert({
    user_id: user.id,
    weight_kg: metricsData.weight_kg,
  })

  // Update profile
  await supabase
    .from("profiles")
    .update({
      height_cm: metricsData.height_cm,
      experience_level: metricsData.experience_level,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  // Immediate invalidation
  updateTag("profile")
  updateTag("dashboard")
  updateTag("body-metrics")
}
