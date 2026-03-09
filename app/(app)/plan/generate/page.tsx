"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GoalStep } from "@/components/onboarding/goal-step"
import { MetricsStep } from "@/components/onboarding/metrics-step"
import { PreferencesStep } from "@/components/onboarding/preferences-step"
import { PlanPreview } from "@/components/onboarding/plan-preview"
import { ManualPlanEditor } from "@/components/plan/manual-plan-editor"
import { saveGoal, saveInitialMetrics, savePlan } from "@/app/actions/plan"
import { Loader2, ArrowLeft, ArrowRight, Check, Flame } from "lucide-react"
import { toast } from "sonner"
import type { WorkoutPlanOutput } from "@/lib/schemas"
import { Skeleton } from "@/components/ui/skeleton"

const STEPS = ["Goal", "About You", "Preferences", "Your Plan"] as const

export default function GeneratePlanPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<WorkoutPlanOutput | null>(null)

  // Step 1: Goal
  const [goalType, setGoalType] = useState("")

  // Step 2: Metrics
  const [weightKg, setWeightKg] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")

  // Step 3: Preferences
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [equipment, setEquipment] = useState<string[]>(["barbell", "dumbbells", "bench"])
  const [focusAreas, setFocusAreas] = useState<string[]>([])

  const handleEquipmentToggle = useCallback((value: string) => {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }, [])

  const handleFocusToggle = useCallback((value: string) => {
    setFocusAreas((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }, [])

  function canProceed(): boolean {
    if (step === 0) return !!goalType
    if (step === 1) return !!weightKg && !!experienceLevel
    if (step === 2) return equipment.length > 0 && focusAreas.length > 0
    return true
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setStep(3)

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: { goal_type: goalType },
          metrics: {
            weight_kg: parseFloat(weightKg),
            height_cm: heightCm ? parseFloat(heightCm) : undefined,
            experience_level: experienceLevel,
          },
          preferences: {
            days_per_week: daysPerWeek,
            session_duration_min: sessionDuration,
            equipment_access: equipment,
            focus_areas: focusAreas,
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to create plan")

      const data = await response.json()
      setGeneratedPlan(data.plan)
    } catch {
      toast.error("Something went wrong. Please try again.")
      setStep(2)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSavePlan() {
    if (!generatedPlan) return
    setIsSaving(true)

    try {
      // Save metrics
      await saveInitialMetrics({
        weight_kg: parseFloat(weightKg),
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        experience_level: experienceLevel,
      })

      // Save goal
      const goal = await saveGoal({
        goal_type: goalType,
        days_per_week: daysPerWeek,
        session_duration_min: sessionDuration,
        equipment_access: equipment,
        focus_areas: focusAreas,
      })

      // Save plan
      await savePlan({
        goalId: goal.id,
        planOutput: generatedPlan,
      })

      toast.success("Your plan is ready!")
      router.push("/dashboard")
    } catch {
      toast.error("Failed to save plan. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleNext() {
    if (step === 2) {
      handleGenerate()
    } else {
      setStep((s) => Math.min(s + 1, 3))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-24 pt-6">
      {/* Progress bar */}
      <div className="animate-fade-in delay-0 mb-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: i <= step ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Step label */}
      <p className="animate-fade-in delay-50 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Step {step + 1} of {STEPS.length} &middot; {STEPS[step]}
      </p>

      {/* Step content */}
      <div className="flex-1">
        {step === 0 && <GoalStep value={goalType} onChange={setGoalType} />}
        {step === 1 && (
          <MetricsStep
            weightKg={weightKg}
            heightCm={heightCm}
            experienceLevel={experienceLevel}
            onWeightChange={setWeightKg}
            onHeightChange={setHeightCm}
            onExperienceChange={setExperienceLevel}
          />
        )}
        {step === 2 && (
          <PreferencesStep
            daysPerWeek={daysPerWeek}
            sessionDuration={sessionDuration}
            equipment={equipment}
            focusAreas={focusAreas}
            onDaysChange={setDaysPerWeek}
            onDurationChange={setSessionDuration}
            onEquipmentToggle={handleEquipmentToggle}
            onFocusToggle={handleFocusToggle}
          />
        )}
        {step === 3 && isGenerating && (
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-3xl uppercase tracking-wide">
                Building Your Plan
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-3.5 w-3.5 animate-pulse text-primary" />
                Creating a workout plan tailored to your goals...
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: daysPerWeek }).map((_, i) => (
                <div key={i} className="forge-card rounded-xl border border-border bg-card p-4" style={{ animationDelay: `${i * 100}ms` }}>
                  <Skeleton className="mb-2 h-5 w-32" />
                  <Skeleton className="mb-3 h-3 w-20" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && !isGenerating && generatedPlan && (
          <div className="flex flex-col gap-4">
            <ManualPlanEditor
              plan={generatedPlan}
              onSave={async (updatedPlan) => {
                setGeneratedPlan(updatedPlan)
              }}
              triggerLabel="Edit Manually"
              title="Review and edit your generated plan"
              description="Make any final changes before saving your workout plan."
              saveLabel="Apply Changes"
              successMessage="Plan edits applied."
              errorMessage="Could not apply your changes."
              triggerClassName="w-full"
            />
            <PlanPreview plan={generatedPlan} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && step < 3 && (
          <Button
            variant="outline"
            size="lg"
            className="h-12 border-border/80 transition-all duration-300 hover:border-primary/20 hover:bg-primary/5"
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}

        {step < 3 && (
          <Button
            size="lg"
            className="group relative h-12 flex-1 overflow-hidden shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
            disabled={!canProceed()}
            onClick={handleNext}
          >
            <span className="relative z-10 flex items-center justify-center gap-1">
              {step === 2 ? "Create My Plan" : "Continue"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
            <div className="btn-shimmer absolute inset-0" />
          </Button>
        )}

        {step === 3 && !isGenerating && generatedPlan && (
          <Button
            size="lg"
            className="group relative h-12 flex-1 overflow-hidden shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
            onClick={handleSavePlan}
            disabled={isSaving}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Start Training"}
            </span>
            <div className="btn-shimmer absolute inset-0" />
          </Button>
        )}
      </div>
    </div>
  )
}
