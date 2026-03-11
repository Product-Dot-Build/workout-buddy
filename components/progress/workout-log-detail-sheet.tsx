"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dumbbell, Clock, BarChart2 } from "lucide-react"
import type { WorkoutLog, LoggedExercise } from "@/lib/types"

interface WorkoutLogDetailSheetProps {
  log: WorkoutLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkoutLogDetailSheet({
  log,
  open,
  onOpenChange,
}: WorkoutLogDetailSheetProps) {
  if (!log) return null

  const exercises = Array.isArray(log.exercises) ? log.exercises : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl border-t border-border"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <Dumbbell className="h-5 w-5 text-primary" />
            {log.workout_day}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">
              {new Date(log.completed_at).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {log.duration_min != null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {log.duration_min}m
              </span>
            )}
            {log.difficulty_rating != null && log.difficulty_rating > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <BarChart2 className="h-3.5 w-3.5" />
                {log.difficulty_rating}/5 difficulty
              </span>
            )}
          </div>

          {log.notes && (
            <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              {log.notes}
            </p>
          )}

          <ScrollArea className="h-[calc(85vh-12rem)]">
            <div className="space-y-3 pr-3">
              {exercises.map((ex: LoggedExercise) => (
                <div
                  key={ex.name}
                  className="forge-card rounded-xl border border-border bg-card p-3"
                >
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    {ex.name}
                  </p>
                  <div className="space-y-1.5">
                    {(ex.sets ?? []).map((set, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md bg-background/50 px-2 py-1.5 font-mono text-sm"
                      >
                        <span className="w-8 text-muted-foreground">
                          Set {i + 1}
                        </span>
                        <span className="text-foreground">
                          {set.weight_kg} kg × {set.reps} reps
                        </span>
                        {set.completed && (
                          <span className="ml-auto text-xs text-success">
                            ✓ Done
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
