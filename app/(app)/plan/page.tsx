import { Suspense } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/layout/app-header"
import { PlanOverview } from "@/components/plan/plan-overview"
import { Button } from "@/components/ui/button"
import { PlanSkeleton } from "@/components/skeletons/plan-skeleton"
import { getPlanData } from "@/lib/data/plan"
import { Plus, Dumbbell } from "lucide-react"

async function PlanData() {
  const data = await getPlanData()
  if (!data) return null

  const { activePlan, activeGoal } = data

  if (!activePlan) {
    return (
      <div>
        <AppHeader title="Workout Plan" />
        <div className="animate-fade-up delay-200 flex flex-col items-center justify-center gap-5 px-4 py-20 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Dumbbell className="h-8 w-8 text-primary" />
            <div className="absolute -inset-2 -z-10 rounded-3xl bg-primary/5 blur-xl" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl uppercase tracking-wide">No Active Plan</h2>
            <p className="text-sm text-muted-foreground">
              Create a plan tailored to your goals and equipment.
            </p>
          </div>
          <Button asChild size="lg" className="group relative mt-2 h-13 overflow-hidden px-8 shadow-lg shadow-primary/20">
            <Link href="/plan/generate">
              <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create My Plan
              </span>
              <div className="btn-shimmer absolute inset-0" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppHeader
        title={activePlan.name}
        subtitle={activePlan.description ?? undefined}
      />
      <PlanOverview plan={activePlan} goal={activeGoal} />
    </div>
  )
}

export default function PlanPage() {
  return (
    <div>
      <Suspense
        fallback={
          <>
            <AppHeader title="Workout Plan" subtitle="Loading..." />
            <PlanSkeleton />
          </>
        }
      >
        <PlanData />
      </Suspense>
    </div>
  )
}
