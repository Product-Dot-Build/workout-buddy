import { generateText, Output } from "ai"
import { z } from "zod"
import {
  goalStepSchema,
  metricsStepSchema,
  preferencesStepSchema,
  workoutPlanOutputSchema,
} from "@/lib/schemas"

const generatePlanRequestSchema = z.object({
  goal: goalStepSchema.extend({
    target_weight_kg: z.coerce.number().min(20).max(300).optional(),
  }),
  metrics: metricsStepSchema,
  preferences: preferencesStepSchema,
})

const goalDescriptions: Record<string, string> = {
  lose_weight: "fat loss with higher rep ranges, supersets, and metabolic conditioning",
  build_muscle: "hypertrophy with moderate-heavy weights, 8-12 rep ranges, and volume",
  get_stronger: "strength with heavy compounds, 3-6 rep ranges, and longer rest periods",
  general_fitness: "balanced training with a mix of compound and isolation movements",
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = generatePlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { goal, metrics, preferences } = parsed.data

    const systemPrompt = `You are an expert personal trainer and strength & conditioning coach.

Produce a weekly plan that reflects the athlete's stated goal and context.

A good plan here tends to show:
- Visible goal-orientation, rather than a one-size-fits-all template.
- Meaningful variation across the week in stimulus and loading (for example, different rep ranges and rest times for different intents).
- Clear intent per exercise (pattern + stimulus), with alternatives that preserve that intent.
- A simple progression idea for what "next week" would look like.
- At least one confident, goal-appropriate programming choice when safe for the athlete's experience level.

Context for this plan:
- Create exactly ${preferences.days_per_week} workout days.
- Each session should be completable in approximately ${preferences.session_duration_min} minutes.
- Available equipment: ${preferences.equipment_access.join(", ")}.
- Priority focus areas: ${preferences.focus_areas.join(", ")}.
- The athlete is a ${metrics.experience_level} lifter weighing ${metrics.weight_kg}kg.

Output expectations:
- For each exercise: sets, reps (or range), rest (seconds), and 1-2 alternatives.
- Include warmup and cooldown text for every day.
- Practical form cues or tips when helpful.`

    const prompt = `Create a ${preferences.days_per_week}-day weekly gym workout plan optimized for ${goalDescriptions[goal.goal_type] || "general fitness"}.

The user is a ${metrics.experience_level} lifter, weighing ${metrics.weight_kg}kg${metrics.height_cm ? `, ${metrics.height_cm}cm tall` : ""}.
${goal.target_weight_kg ? `Their target weight is ${goal.target_weight_kg}kg.` : ""}

Give each day a clear name like "Day 1 - Push" or "Day 1 - Upper Body".`

    const { output } = await generateText({
      model: "google/gemini-3-flash",
      output: Output.object({ schema: workoutPlanOutputSchema }),
      system: systemPrompt,
      prompt,
    })

    return Response.json({ plan: output })
  } catch {
    return Response.json({ error: "Failed to generate plan" }, { status: 500 })
  }
}
