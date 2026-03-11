"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ExerciseLogForm } from "@/components/workout/exercise-log-form"
import { DifficultyRating } from "@/components/workout/difficulty-rating"
import { saveWorkoutLog } from "@/app/actions/workout-log"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Check, Dumbbell, History, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import type { WorkoutPlan, LoggedExercise, LoggedSet, WorkoutLog } from "@/lib/types"

interface WorkoutLogFormProps {
  activePlan: WorkoutPlan | null
  weeklyLogCount: number
  lastLogForDay?: WorkoutLog | null
}

export function WorkoutLogForm({ activePlan, weeklyLogCount, lastLogForDay }: WorkoutLogFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [difficulty, setDifficulty] = useState(0)
  const [notes, setNotes] = useState("")

  const todayDayIndex = activePlan
    ? weeklyLogCount % activePlan.plan_data.days.length
    : 0
  const todayWorkout = activePlan?.plan_data.days[todayDayIndex]

  const initialSets = useMemo(() => {
    if (!todayWorkout) return {}
    const map: Record<string, LoggedSet[]> = {}
    todayWorkout.exercises.forEach((ex) => {
      map[ex.name] = Array.from({ length: ex.sets }, () => ({
        weight_kg: 0,
        reps: 0,
        completed: false,
      }))
    })
    return map
  }, [todayWorkout])

  const [exerciseSets, setExerciseSets] = useState<Record<string, LoggedSet[]>>(initialSets)

  function handleSetsChange(exerciseName: string, sets: LoggedSet[]) {
    setExerciseSets((prev) => ({ ...prev, [exerciseName]: sets }))
  }

  function applyLastAsTemplate() {
    if (!lastLogForDay || !todayWorkout) return
    const exercises = lastLogForDay.exercises ?? []
    const map: Record<string, LoggedSet[]> = {}
    todayWorkout.exercises.forEach((ex) => {
      const lastEx = exercises.find((e) => e.name === ex.name)
      if (lastEx?.sets?.length) {
        map[ex.name] = Array.from(
          { length: Math.max(ex.sets, lastEx.sets.length) },
          (_, i) =>
            lastEx.sets[i]
              ? { ...lastEx.sets[i], completed: false }
              : { weight_kg: 0, reps: 0, completed: false }
        )
      } else {
        map[ex.name] = Array.from({ length: ex.sets }, () => ({
          weight_kg: 0,
          reps: 0,
          completed: false,
        }))
      }
    })
    setExerciseSets(map)
    toast.success("Last workout applied as template")
  }

  async function handleSubmit() {
    if (!todayWorkout || !activePlan) return
    setIsSaving(true)

    const exercises: LoggedExercise[] = Object.entries(exerciseSets).map(
      ([name, sets]) => ({ name, sets })
    )

    try {
      await saveWorkoutLog({
        planId: activePlan.id,
        workoutDay: todayWorkout.name,
        exercises,
        durationMin: null,
        difficultyRating: difficulty,
        notes,
      })
      toast.success("Workout logged!")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Failed to save workout")
    } finally {
      setIsSaving(false)
    }
  }

  if (!todayWorkout || !activePlan) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Dumbbell className="h-7 w-7 text-primary" />
        </div>
        <p className="text-muted-foreground">No active plan. Create a plan first to start logging.</p>
      </div>
    )
  }

  const totalSets = Object.values(exerciseSets).flat()
  const completedSets = totalSets.filter((s) => s.completed).length
  const completionPercent = totalSets.length > 0 ? (completedSets / totalSets.length) * 100 : 0

  return (
    <div className="flex flex-col gap-4 px-4 pb-24">
      {/* Workout summary card */}
      <div className="animate-fade-up delay-100 forge-card rounded-xl border border-border bg-card p-4">
        <div className="relative flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{todayWorkout.name}</p>
            <p className="text-xs text-muted-foreground">{todayWorkout.focus}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-primary">
              {completedSets}/{totalSets.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">sets done</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {lastLogForDay && (
        <Collapsible defaultOpen={false} className="animate-fade-up">
          <CollapsibleTrigger className="forge-card flex w-full items-center justify-between rounded-xl border border-border bg-card/80 p-3 transition-colors hover:bg-card">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-medium text-foreground">
                Last {todayWorkout.name} &middot;{" "}
                {new Date(lastLogForDay.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-card/50 p-3">
              {(lastLogForDay.exercises ?? []).map((ex) => (
                <div key={ex.name} className="text-sm">
                  <p className="font-medium text-foreground">{ex.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {(ex.sets ?? [])
                      .filter((s) => s.weight_kg > 0 || s.reps > 0)
                      .map((s, i) => `${s.weight_kg}kg × ${s.reps}`)
                      .join(" · ") || "—"}
                  </p>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-primary/30 text-primary hover:bg-primary/10"
                onClick={applyLastAsTemplate}
              >
                Use as template
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {todayWorkout.exercises.map((exercise, i) => (
        <div key={exercise.name} className="animate-fade-up" style={{ animationDelay: `${150 + i * 50}ms` }}>
          <ExerciseLogForm
            exercise={exercise}
            sets={exerciseSets[exercise.name] || []}
            onSetsChange={(sets) => handleSetsChange(exercise.name, sets)}
          />
        </div>
      ))}

      <div className="animate-fade-up" style={{ animationDelay: `${150 + todayWorkout.exercises.length * 50 + 50}ms` }}>
        <DifficultyRating value={difficulty} onChange={setDifficulty} />
      </div>

      <div className="animate-fade-up space-y-2" style={{ animationDelay: `${150 + todayWorkout.exercises.length * 50 + 100}ms` }}>
        <Label htmlFor="notes" className="text-xs uppercase tracking-wider text-muted-foreground">
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="How did it feel? Any PRs?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-card focus-visible:border-primary/50 focus-visible:ring-primary/20"
        />
      </div>

      <Button
        size="lg"
        className="group relative h-12 overflow-hidden shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
        onClick={handleSubmit}
        disabled={isSaving || completedSets === 0}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Finish Workout"}
        </span>
        <div className="btn-shimmer absolute inset-0" />
      </Button>
    </div>
  )
}
