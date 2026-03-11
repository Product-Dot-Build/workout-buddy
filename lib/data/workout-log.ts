import { cacheLife, cacheTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { WorkoutPlan, WorkoutLog } from "@/lib/types"

/**
 * Fetches workout log page data with a per-user private cache.
 *
 * `weekStartIso` must be computed *outside* the cache boundary
 * because Date.now() is non-deterministic inside `use cache`.
 */
export async function getWorkoutLogData(weekStartIso: string) {
  "use cache: private"
  cacheLife("minutes")
  cacheTag("workout-log", "workout-plans", "workout-logs")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [planRes, logsRes] = await Promise.all([
    supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", weekStartIso),
  ])

  const activePlan = planRes.data as WorkoutPlan | null
  const weeklyLogCount = logsRes.data?.length ?? 0

  const todayDayIndex = activePlan
    ? weeklyLogCount % activePlan.plan_data.days.length
    : 0
  const todayWorkout = activePlan?.plan_data.days[todayDayIndex]
  const workoutDayName = todayWorkout?.name ?? null

  let lastLogForDay: WorkoutLog | null = null
  if (workoutDayName && activePlan?.id) {
    const { data } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_id", activePlan.id)
      .eq("workout_day", workoutDayName)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    lastLogForDay = data as WorkoutLog | null
  }

  return {
    activePlan,
    weeklyLogCount,
    lastLogForDay,
  }
}
