"use client"

import { useRouter } from "next/navigation"
import type { WorkoutPlan, FitnessGoal } from "@/lib/types"
import { updatePlan } from "@/app/actions/plan"
import { ManualPlanEditor } from "@/components/plan/manual-plan-editor"
import { WorkoutDayCard } from "@/components/workout/workout-day-card"
import { PlanFeedbackDrawer } from "@/components/plan/plan-feedback-drawer"

interface PlanOverviewProps {
  plan: WorkoutPlan
  goal: FitnessGoal | null
}

export function PlanOverview({ plan, goal }: PlanOverviewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <p className="animate-fade-in delay-50 text-sm text-muted-foreground">
        {plan.plan_data.days.length} days per week &middot; Week {plan.week_number}
      </p>

      <div className="animate-fade-up" style={{ animationDelay: "75ms" }}>
        <ManualPlanEditor
          plan={{
            name: plan.name,
            description: plan.description ?? "",
            days: plan.plan_data.days,
          }}
          onSave={async (planOutput) => {
            await updatePlan({ planId: plan.id, planOutput })
            router.refresh()
          }}
          triggerLabel="Edit Manually"
          title="Manually update your plan"
          description="Adjust day details, swap exercises, or fine-tune sets and rest periods."
          successMessage="Manual plan changes saved."
          errorMessage="Could not save your plan changes."
          triggerClassName="w-full"
        />
      </div>

      {plan.plan_data.days.map((day, index) => (
        <div key={index} className="animate-fade-up" style={{ animationDelay: `${100 + index * 75}ms` }}>
          <WorkoutDayCard day={day} dayIndex={index} />
        </div>
      ))}

      <div className="animate-fade-up" style={{ animationDelay: `${100 + plan.plan_data.days.length * 75 + 50}ms` }}>
        <PlanFeedbackDrawer plan={plan} goal={goal} />
      </div>
    </div>
  )
}
