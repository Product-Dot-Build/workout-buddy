import { Suspense } from "react"
import { connection } from "next/server"
import { AppHeader } from "@/components/layout/app-header"
import { WorkoutLogForm } from "@/components/workout/workout-log-form"
import { WorkoutLogSkeleton } from "@/components/skeletons/workout-log-skeleton"
import { getWorkoutLogData } from "@/lib/data/workout-log"

async function WorkoutLogData() {
  // Defer to request time so Date.now() is fresh (required for PPR)
  await connection()
  const weekStartIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const data = await getWorkoutLogData(weekStartIso)
  if (!data) return null

  return (
    <WorkoutLogForm
      activePlan={data.activePlan}
      weeklyLogCount={data.weeklyLogCount}
      lastLogForDay={data.lastLogForDay}
    />
  )
}

export default function WorkoutLogPage() {
  return (
    <div>
      {/* Static shell - prerendered instantly */}
      <AppHeader title="Log Workout" subtitle="Record your sets and reps" />

      {/* Dynamic - streams in with plan & log count */}
      <Suspense fallback={<WorkoutLogSkeleton />}>
        <WorkoutLogData />
      </Suspense>
    </div>
  )
}
