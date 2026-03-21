"use client"

import { useState, useTransition } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dumbbell, Clock, BarChart2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteWorkoutLog } from "@/app/actions/workout-log"
import type { WorkoutLog, LoggedExercise } from "@/lib/types"

interface WorkoutLogDetailDrawerProps {
  log: WorkoutLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (logId: string) => void
}

export function WorkoutLogDetailDrawer({
  log,
  open,
  onOpenChange,
  onDeleted,
}: WorkoutLogDetailDrawerProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!log) return null

  const exercises = Array.isArray(log.exercises) ? log.exercises : []

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteWorkoutLog(log!.id)
        toast.success("Workout session deleted")
        setConfirmOpen(false)
        onOpenChange(false)
        onDeleted?.(log!.id)
      } catch {
        toast.error("Failed to delete session")
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {log.workout_day}
            </DrawerTitle>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete workout session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the{" "}
                    <span className="font-medium text-foreground">
                      {log.workout_day}
                    </span>{" "}
                    session logged on{" "}
                    {new Date(log.completed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    . This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
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

          <ScrollArea className="h-[calc(85vh-14rem)]">
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
                            Done
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
      </DrawerContent>
    </Drawer>
  )
}
