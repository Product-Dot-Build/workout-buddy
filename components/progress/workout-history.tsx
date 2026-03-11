"use client"

import { useState } from "react"
import type { WorkoutLog } from "@/lib/types"
import { Dumbbell, Clock, ChevronRight } from "lucide-react"
import { WorkoutLogDetailSheet } from "./workout-log-detail-sheet"

interface WorkoutHistoryProps {
  logs: WorkoutLog[]
}

export function WorkoutHistory({ logs }: WorkoutHistoryProps) {
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function openDetail(log: WorkoutLog) {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  if (logs.length === 0) {
    return (
      <div className="forge-card flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">No workouts logged yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {logs.map((log, i) => {
          const exercises = Array.isArray(log.exercises) ? log.exercises : []
          const totalSets = exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0)
          const completedSets = exercises.reduce(
            (sum, e) => sum + (e.sets?.filter((s) => s.completed).length || 0),
            0
          )

          return (
            <button
              key={log.id}
              type="button"
              onClick={() => openDetail(log)}
              className="forge-card flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 hover:bg-card/80 active:bg-card/60"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{log.workout_day}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{completedSets}/{totalSets} sets</span>
                  {log.duration_min && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {log.duration_min}m
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {new Date(log.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </button>
          )
        })}
      </div>

      <WorkoutLogDetailSheet
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
