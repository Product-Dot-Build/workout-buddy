"use client"

import { useEffect, useState } from "react"
import { Loader2, PencilLine, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { WorkoutPlanOutput } from "@/lib/schemas"
import { cn } from "@/lib/utils"

interface ManualPlanEditorProps {
  plan: WorkoutPlanOutput
  onSave: (plan: WorkoutPlanOutput) => Promise<void> | void
  triggerLabel?: string
  title?: string
  description?: string
  saveLabel?: string
  successMessage?: string
  errorMessage?: string
  triggerClassName?: string
}

const DEFAULT_EXERCISE = {
  name: "New Exercise",
  sets: 3,
  reps: "8-12",
  rest_sec: 90,
  notes: null,
  alternatives: [],
} as const

function clonePlan(plan: WorkoutPlanOutput): WorkoutPlanOutput {
  return {
    name: plan.name,
    description: plan.description,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        alternatives: [...exercise.alternatives],
      })),
    })),
  }
}

function createDay(dayNumber: number): WorkoutPlanOutput["days"][number] {
  return {
    name: `Day ${dayNumber}`,
    focus: "Full body",
    warmup: "5-10 minutes of light cardio and dynamic mobility.",
    exercises: [{ ...DEFAULT_EXERCISE, alternatives: [] }],
    cooldown: "Easy walking and light stretching for 5 minutes.",
  }
}

function normalizePlan(plan: WorkoutPlanOutput): WorkoutPlanOutput {
  return {
    name: plan.name.trim() || "Custom Workout Plan",
    description: plan.description.trim() || "Manually updated workout plan.",
    days: plan.days.map((day, dayIndex) => ({
      name: day.name.trim() || `Day ${dayIndex + 1}`,
      focus: day.focus.trim() || "Full body",
      warmup: day.warmup.trim(),
      cooldown: day.cooldown.trim(),
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        name: exercise.name.trim() || `Exercise ${exerciseIndex + 1}`,
        sets: Math.max(1, Math.round(exercise.sets || 1)),
        reps: exercise.reps.trim() || "8-12",
        rest_sec: Math.max(0, Math.round(exercise.rest_sec || 0)),
        notes: exercise.notes?.trim() ? exercise.notes.trim() : null,
        alternatives: exercise.alternatives
          .map((alternative) => alternative.trim())
          .filter(Boolean),
      })),
    })),
  }
}

export function ManualPlanEditor({
  plan,
  onSave,
  triggerLabel = "Edit Plan",
  title = "Edit plan manually",
  description = "Update days, exercises, and notes before saving your plan.",
  saveLabel = "Save Changes",
  successMessage = "Plan updated.",
  errorMessage = "Failed to save plan changes.",
  triggerClassName,
}: ManualPlanEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState<WorkoutPlanOutput>(() => clonePlan(plan))

  useEffect(() => {
    if (isOpen) {
      setDraft(clonePlan(plan))
    }
  }, [isOpen, plan])

  function updatePlanField<K extends keyof WorkoutPlanOutput>(field: K, value: WorkoutPlanOutput[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function updateDayField(
    dayIndex: number,
    field: keyof WorkoutPlanOutput["days"][number],
    value: string | WorkoutPlanOutput["days"][number]["exercises"]
  ) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, index) => (index === dayIndex ? { ...day, [field]: value } : day)),
    }))
  }

  function updateExerciseField(
    dayIndex: number,
    exerciseIndex: number,
    field: keyof WorkoutPlanOutput["days"][number]["exercises"][number],
    value: string | number | null | string[]
  ) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day

        return {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) =>
            currentExerciseIndex === exerciseIndex ? { ...exercise, [field]: value } : exercise
          ),
        }
      }),
    }))
  }

  function addDay() {
    setDraft((current) => ({
      ...current,
      days: [...current.days, createDay(current.days.length + 1)],
    }))
  }

  function removeDay(dayIndex: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.filter((_, index) => index !== dayIndex),
    }))
  }

  function addExercise(dayIndex: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: [...day.exercises, { ...DEFAULT_EXERCISE, alternatives: [] }],
            }
          : day
      ),
    }))
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.filter((_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex),
            }
          : day
      ),
    }))
  }

  async function handleSave() {
    setIsSaving(true)

    try {
      const normalized = normalizePlan(draft)
      await onSave(normalized)
      toast.success(successMessage)
      setIsOpen(false)
    } catch {
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-border/80 transition-all duration-300 hover:border-primary/20 hover:bg-primary/5",
            triggerClassName
          )}
        >
          <PencilLine className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-hidden border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="font-display text-2xl uppercase tracking-wide">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-148px)] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Plan name
                </Label>
                <Input
                  id="plan-name"
                  value={draft.name}
                  onChange={(event) => updatePlanField("name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-description" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="plan-description"
                  value={draft.description}
                  onChange={(event) => updatePlanField("description", event.target.value)}
                  className="min-h-[96px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workout Days</p>
                <p className="text-sm text-muted-foreground">Edit each day or add a new one.</p>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={addDay}>
                <Plus className="h-4 w-4" />
                Add day
              </Button>
            </div>

            <div className="space-y-4">
              {draft.days.map((day, dayIndex) => (
                <section key={dayIndex} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Day {dayIndex + 1}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDay(dayIndex)}
                      disabled={draft.days.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove day
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Day name</Label>
                      <Input
                        value={day.name}
                        onChange={(event) => updateDayField(dayIndex, "name", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Focus</Label>
                      <Input
                        value={day.focus}
                        onChange={(event) => updateDayField(dayIndex, "focus", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Warmup</Label>
                      <Textarea
                        value={day.warmup}
                        onChange={(event) => updateDayField(dayIndex, "warmup", event.target.value)}
                        className="min-h-[88px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cooldown</Label>
                      <Textarea
                        value={day.cooldown}
                        onChange={(event) => updateDayField(dayIndex, "cooldown", event.target.value)}
                        className="min-h-[88px]"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Exercises
                      </p>
                      <p className="text-sm text-muted-foreground">Adjust sets, reps, rest, or alternatives.</p>
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => addExercise(dayIndex)}>
                      <Plus className="h-4 w-4" />
                      Add exercise
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div
                        key={`${dayIndex}-${exerciseIndex}`}
                        className="rounded-xl border border-border/70 bg-card p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Exercise {exerciseIndex + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExercise(dayIndex, exerciseIndex)}
                            disabled={day.exercises.length === 1}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                              Exercise name
                            </Label>
                            <Input
                              value={exercise.name}
                              onChange={(event) =>
                                updateExerciseField(dayIndex, exerciseIndex, "name", event.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sets</Label>
                            <Input
                              type="number"
                              min={1}
                              value={exercise.sets}
                              onChange={(event) =>
                                updateExerciseField(dayIndex, exerciseIndex, "sets", Number(event.target.value))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reps</Label>
                            <Input
                              value={exercise.reps}
                              onChange={(event) =>
                                updateExerciseField(dayIndex, exerciseIndex, "reps", event.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                              Rest (sec)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={15}
                              value={exercise.rest_sec}
                              onChange={(event) =>
                                updateExerciseField(dayIndex, exerciseIndex, "rest_sec", Number(event.target.value))
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
                            <Textarea
                              value={exercise.notes ?? ""}
                              onChange={(event) =>
                                updateExerciseField(dayIndex, exerciseIndex, "notes", event.target.value || null)
                              }
                              className="min-h-[88px]"
                              placeholder="Optional coaching notes or cues."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                              Alternatives
                            </Label>
                            <Textarea
                              value={exercise.alternatives.join(", ")}
                              onChange={(event) =>
                                updateExerciseField(
                                  dayIndex,
                                  exerciseIndex,
                                  "alternatives",
                                  event.target.value.split(",").map((value) => value.trim()).filter(Boolean)
                                )
                              }
                              className="min-h-[88px]"
                              placeholder="Separate alternatives with commas."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
