import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { workoutPlanUpdateOutputSchema } from "@/lib/schemas"

const LOOKBACK_MONTHS = 2

const updatePlanRequestSchema = z.object({
  feedback: z.string().trim().max(1000).optional(),
})

const goalDescriptions: Record<string, string> = {
  lose_weight: "fat loss with higher rep ranges, supersets, and metabolic conditioning",
  build_muscle: "hypertrophy with moderate-heavy weights, 8-12 rep ranges, and volume",
  get_stronger: "strength with heavy compounds, 3-6 rep ranges, and longer rest periods",
  general_fitness: "balanced training with a mix of compound and isolation movements",
}

interface GoalRow {
  id: string
  goal_type: string
  target_weight_kg: number | string | null
  days_per_week: number | null
  session_duration_min?: number | null
  preferred_duration_min?: number | null
  equipment_access: string[] | null
  focus_areas: string[] | null
}

interface ProfileRow {
  experience_level: string | null
  height_cm: number | string | null
}

interface ActivePlanRow {
  id: string
  name: string
  description: string | null
  week_number: number | null
  plan_data: unknown
}

interface HistoricalPlanRow {
  id: string
  name: string
  description: string | null
  week_number: number | null
  is_active: boolean
  created_at: string
  plan_data: unknown
}

interface WorkoutLogRow {
  workout_day: string | null
  completed_at: string
  duration_min: number | null
  difficulty_rating: number | null
  notes: string | null
  exercises: unknown
}

interface BodyMetricRow {
  recorded_at: string
  weight_kg: number | string | null
  body_fat_pct: number | string | null
  chest_cm: number | string | null
  waist_cm: number | string | null
  hips_cm: number | string | null
  bicep_cm: number | string | null
  thigh_cm: number | string | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function round(value: number, digits = 1): number {
  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function trendDirection(start: number | null, end: number | null): "up" | "down" | "flat" | "unknown" {
  if (start === null || end === null) return "unknown"
  const delta = end - start
  if (delta >= 0.25) return "up"
  if (delta <= -0.25) return "down"
  return "flat"
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function extractExerciseNames(exercises: unknown): string[] {
  if (!Array.isArray(exercises)) return []

  return exercises
    .map((exercise) => {
      if (typeof exercise !== "object" || exercise === null) return null
      const name = (exercise as { name?: unknown }).name
      return typeof name === "string" ? name : null
    })
    .filter((name): name is string => Boolean(name))
}

function summarizeWorkoutLogs(logs: WorkoutLogRow[], daysPerWeek: number) {
  const durationValues = logs
    .map((log) => toNumber(log.duration_min))
    .filter((value): value is number => value !== null)

  const difficultyValues = logs
    .map((log) => toNumber(log.difficulty_rating))
    .filter((value): value is number => value !== null)

  const dayCounts = new Map<string, number>()
  for (const log of logs) {
    const day = log.workout_day?.trim()
    if (!day) continue
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }

  const noteHighlights = logs
    .filter((log) => typeof log.notes === "string" && log.notes.trim().length > 0)
    .slice(-6)
    .map((log) => ({
      completed_at: log.completed_at,
      note: log.notes as string,
    }))

  const expectedWorkouts = daysPerWeek * LOOKBACK_MONTHS * 4
  const adherenceRatio = expectedWorkouts > 0 ? logs.length / expectedWorkouts : null

  const firstHalfDifficulties = difficultyValues.slice(0, Math.floor(difficultyValues.length / 2))
  const secondHalfDifficulties = difficultyValues.slice(Math.floor(difficultyValues.length / 2))
  const firstHalfDifficultyAvg = average(firstHalfDifficulties)
  const secondHalfDifficultyAvg = average(secondHalfDifficulties)
  const difficultyTrend = trendDirection(firstHalfDifficultyAvg, secondHalfDifficultyAvg)

  return {
    total_workouts: logs.length,
    expected_workouts: expectedWorkouts,
    adherence_ratio: adherenceRatio === null ? null : round(adherenceRatio, 2),
    average_duration_min:
      durationValues.length === 0
        ? null
        : round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length),
    average_difficulty:
      difficultyValues.length === 0
        ? null
        : round(difficultyValues.reduce((sum, value) => sum + value, 0) / difficultyValues.length),
    first_half_avg_difficulty:
      firstHalfDifficultyAvg === null ? null : round(firstHalfDifficultyAvg, 2),
    second_half_avg_difficulty:
      secondHalfDifficultyAvg === null ? null : round(secondHalfDifficultyAvg, 2),
    difficulty_trend: difficultyTrend,
    top_logged_days: Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([day, count]) => ({ day, count })),
    note_highlights: noteHighlights,
  }
}

function summarizeBodyMetrics(metrics: BodyMetricRow[]) {
  if (metrics.length === 0) {
    return {
      entries: 0,
      first_recorded_at: null,
      latest_recorded_at: null,
      latest: null,
      changes: null,
    }
  }

  const first = metrics[0]
  const latest = metrics[metrics.length - 1]

  const firstWeight = toNumber(first.weight_kg)
  const latestWeight = toNumber(latest.weight_kg)
  const firstBodyFat = toNumber(first.body_fat_pct)
  const latestBodyFat = toNumber(latest.body_fat_pct)
  const firstWaist = toNumber(first.waist_cm)
  const latestWaist = toNumber(latest.waist_cm)
  const firstChest = toNumber(first.chest_cm)
  const latestChest = toNumber(latest.chest_cm)
  const firstBicep = toNumber(first.bicep_cm)
  const latestBicep = toNumber(latest.bicep_cm)
  const firstThigh = toNumber(first.thigh_cm)
  const latestThigh = toNumber(latest.thigh_cm)

  return {
    entries: metrics.length,
    first_recorded_at: first.recorded_at,
    latest_recorded_at: latest.recorded_at,
    latest: {
      weight_kg: latestWeight,
      body_fat_pct: latestBodyFat,
      chest_cm: toNumber(latest.chest_cm),
      waist_cm: latestWaist,
      hips_cm: toNumber(latest.hips_cm),
      bicep_cm: toNumber(latest.bicep_cm),
      thigh_cm: toNumber(latest.thigh_cm),
    },
    changes: {
      weight_kg:
        firstWeight !== null && latestWeight !== null
          ? round(latestWeight - firstWeight, 2)
          : null,
      body_fat_pct:
        firstBodyFat !== null && latestBodyFat !== null
          ? round(latestBodyFat - firstBodyFat, 2)
          : null,
      waist_cm:
        firstWaist !== null && latestWaist !== null
          ? round(latestWaist - firstWaist, 2)
          : null,
      chest_cm:
        firstChest !== null && latestChest !== null
          ? round(latestChest - firstChest, 2)
          : null,
      bicep_cm:
        firstBicep !== null && latestBicep !== null
          ? round(latestBicep - firstBicep, 2)
          : null,
      thigh_cm:
        firstThigh !== null && latestThigh !== null
          ? round(latestThigh - firstThigh, 2)
          : null,
    },
  }
}

function getExperienceLevel(value: string | null): "beginner" | "intermediate" | "advanced" {
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value
  }
  return "intermediate"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsedBody = updatePlanRequestSchema.safeParse(body)

    if (!parsedBody.success) {
      return Response.json(
        { error: "Invalid request payload", details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    const lookbackDate = new Date()
    lookbackDate.setMonth(lookbackDate.getMonth() - LOOKBACK_MONTHS)
    const lookbackIso = lookbackDate.toISOString()
    const lookbackDateOnly = lookbackIso.slice(0, 10)

    const [goalRes, activePlanRes, profileRes, logsRes, metricsRes, latestMetricRes, historicalPlansRes] =
      await Promise.all([
        supabase
          .from("fitness_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("experience_level, height_cm")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("workout_logs")
          .select("workout_day, completed_at, duration_min, difficulty_rating, notes, exercises")
          .eq("user_id", user.id)
          .gte("completed_at", lookbackIso)
          .order("completed_at", { ascending: true })
          .limit(120),
        supabase
          .from("body_metrics")
          .select(
            "recorded_at, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_cm, thigh_cm"
          )
          .eq("user_id", user.id)
          .gte("recorded_at", lookbackDateOnly)
          .order("recorded_at", { ascending: true })
          .limit(90),
        supabase
          .from("body_metrics")
          .select("weight_kg")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workout_plans")
          .select("id, name, description, week_number, is_active, created_at, plan_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(12),
      ])

    if (goalRes.error) {
      return Response.json({ error: goalRes.error.message }, { status: 500 })
    }
    if (activePlanRes.error) {
      return Response.json({ error: activePlanRes.error.message }, { status: 500 })
    }
    if (profileRes.error) {
      return Response.json({ error: profileRes.error.message }, { status: 500 })
    }
    if (logsRes.error) {
      return Response.json({ error: logsRes.error.message }, { status: 500 })
    }
    if (metricsRes.error) {
      return Response.json({ error: metricsRes.error.message }, { status: 500 })
    }
    if (latestMetricRes.error) {
      return Response.json({ error: latestMetricRes.error.message }, { status: 500 })
    }
    if (historicalPlansRes.error) {
      return Response.json({ error: historicalPlansRes.error.message }, { status: 500 })
    }

    const activeGoal = goalRes.data as GoalRow | null
    const activePlan = activePlanRes.data as ActivePlanRow | null
    const profile = profileRes.data as ProfileRow | null
    const workoutLogs = (logsRes.data ?? []) as WorkoutLogRow[]
    const bodyMetrics = (metricsRes.data ?? []) as BodyMetricRow[]
    const historicalPlans = (historicalPlansRes.data ?? []) as HistoricalPlanRow[]

    if (!activeGoal || !activePlan) {
      return Response.json(
        { error: "An active goal and active plan are required before updating a plan." },
        { status: 400 }
      )
    }

    const feedback = parsedBody.data.feedback
    const equipmentAccess = toStringArray(activeGoal.equipment_access)
    const focusAreas = toStringArray(activeGoal.focus_areas)
    const targetWeight = toNumber(activeGoal.target_weight_kg)
    const targetDaysPerWeek = Math.max(2, Math.min(6, toNumber(activeGoal.days_per_week) ?? 3))
    const targetSessionDuration = Math.max(
      30,
      Math.min(
        120,
        toNumber(activeGoal.session_duration_min ?? activeGoal.preferred_duration_min) ?? 60
      )
    )

    const latestLookbackWeight = toNumber(bodyMetrics.at(-1)?.weight_kg ?? null)
    const latestStoredWeight = toNumber(
      (latestMetricRes.data as { weight_kg?: number | string | null } | null)?.weight_kg ?? null
    )
    const currentWeightKg = latestLookbackWeight ?? latestStoredWeight ?? 75
    const heightCm = toNumber(profile?.height_cm ?? null)
    const experienceLevel = getExperienceLevel(profile?.experience_level ?? null)
    const goalType = activeGoal.goal_type || "general_fitness"
    const goalDescription = goalDescriptions[goalType] ?? "general fitness"

    const workoutSummary = summarizeWorkoutLogs(workoutLogs, targetDaysPerWeek)
    const bodyMetricSummary = summarizeBodyMetrics(bodyMetrics)

    const normalizedWorkoutLogs = workoutLogs.map((log) => ({
      completed_at: log.completed_at,
      workout_day: log.workout_day,
      duration_min: toNumber(log.duration_min),
      difficulty_rating: toNumber(log.difficulty_rating),
      notes: log.notes,
      exercises: Array.isArray(log.exercises) ? log.exercises : [],
      exercise_names: extractExerciseNames(log.exercises),
    }))

    const normalizedBodyMetrics = bodyMetrics.map((metric) => ({
      recorded_at: metric.recorded_at,
      weight_kg: toNumber(metric.weight_kg),
      body_fat_pct: toNumber(metric.body_fat_pct),
      chest_cm: toNumber(metric.chest_cm),
      waist_cm: toNumber(metric.waist_cm),
      hips_cm: toNumber(metric.hips_cm),
      bicep_cm: toNumber(metric.bicep_cm),
      thigh_cm: toNumber(metric.thigh_cm),
    }))

    const planTimeline = historicalPlans.map((plan) => {
      const planData =
        typeof plan.plan_data === "object" && plan.plan_data !== null
          ? (plan.plan_data as { days?: unknown })
          : {}
      const days = Array.isArray(planData.days) ? planData.days : []
      const dayNames = days
        .map((day) => {
          if (typeof day !== "object" || day === null) return null
          const dayName = (day as { name?: unknown }).name
          return typeof dayName === "string" ? dayName : null
        })
        .filter((name): name is string => Boolean(name))

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        week_number: plan.week_number,
        is_active: plan.is_active,
        created_at: plan.created_at,
        days_count: days.length,
        day_names: dayNames,
      }
    })

    const systemPrompt = `You are an expert personal trainer updating an active workout plan.

Update the plan in a way that reflects evidence from the last ${LOOKBACK_MONTHS} months (logs, difficulty ratings, metrics, adherence) and the athlete's goal.

A strong update here usually includes:
- A clear reason for change that is grounded in the available data.
- Changes that are specific and goal-driven, not generic.
- The plan showing multiple distinct stimuli across the week (rather than repeating the same prescription everywhere).
- A simple progression rule for the next week.

When interpreting the data, typical coaching tradeoffs apply:
- Low adherence often benefits from simplification and higher "repeatability".
- Good adherence with stalled progress often benefits from changing a single main lever (intensity, volume, exercise selection, frequency, or density).
- Improving performance with decreasing perceived difficulty can justify a bolder next phase.

Your job is to decide whether to:
1) "update_current_plan" with targeted adjustments, or
2) "generate_new_plan" with a fresh structure.

Context for this plan:
- Sessions must fit ~${targetSessionDuration} minutes.
- Available equipment: ${equipmentAccess.join(", ") || "bodyweight"}.
- Priority focus areas: ${focusAreas.join(", ") || "balanced full body"}.
- The athlete is a ${experienceLevel} lifter weighing ${currentWeightKg}kg.

Output expectations:
- Return action, rationale, and plan.
- For each exercise: sets, reps (or range), rest (seconds), and 1-2 alternatives.
- Include warmup and cooldown text for every day.`

    const prompt = `Update this user's plan for ${goalDescription}.

User goal:
${JSON.stringify(
  {
    goal_type: goalType,
    target_weight_kg: targetWeight,
    days_per_week: targetDaysPerWeek,
    session_duration_min: targetSessionDuration,
    equipment_access: equipmentAccess,
    focus_areas: focusAreas,
  },
  null,
  2
)}

User metrics:
${JSON.stringify(
  {
    weight_kg: currentWeightKg,
    height_cm: heightCm,
    experience_level: experienceLevel,
  },
  null,
  2
)}

Current active plan:
${JSON.stringify(
  {
    id: activePlan.id,
    name: activePlan.name,
    description: activePlan.description,
    week_number: activePlan.week_number,
    plan_data: activePlan.plan_data,
  },
  null,
  2
)}

Workout log summary (past ${LOOKBACK_MONTHS} months):
${JSON.stringify(workoutSummary, null, 2)}

Plan timeline (oldest to newest):
${JSON.stringify(planTimeline, null, 2)}

Body metric summary (past ${LOOKBACK_MONTHS} months):
${JSON.stringify(bodyMetricSummary, null, 2)}

Raw workout logs (past ${LOOKBACK_MONTHS} months):
${JSON.stringify(normalizedWorkoutLogs, null, 2)}

Raw body metrics (past ${LOOKBACK_MONTHS} months):
${JSON.stringify(normalizedBodyMetrics, null, 2)}

User feedback:
${feedback && feedback.length > 0 ? feedback : "No additional feedback provided."}

Return:
- action: "update_current_plan" or "generate_new_plan"
- rationale: concise explanation
- plan: the updated/generated weekly plan`

    const { output } = await generateText({
      model: "google/gemini-3-flash",
      output: Output.object({ schema: workoutPlanUpdateOutputSchema }),
      system: systemPrompt,
      prompt,
    })

    return Response.json({
      action: output.action,
      rationale: output.rationale,
      plan: output.plan,
      lookback_months: LOOKBACK_MONTHS,
    })
  } catch {
    return Response.json({ error: "Failed to update plan" }, { status: 500 })
  }
}
