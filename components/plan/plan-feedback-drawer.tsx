"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer"
import { MessageSquare, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { savePlan } from "@/app/actions/plan"
import type { FitnessGoal, WorkoutPlan } from "@/lib/types"
import type { WorkoutPlanOutput } from "@/lib/schemas"

const QUICK_FEEDBACK = [
  "Too easy overall",
  "Too hard overall",
  "Need more rest days",
  "Want more leg work",
  "Want more upper body",
  "Sessions are too long",
] as const

interface PlanFeedbackDrawerProps {
  plan: WorkoutPlan
  goal: FitnessGoal | null
}

interface UpdatePlanResponse {
  action: "update_current_plan" | "generate_new_plan"
  rationale: string
  plan: WorkoutPlanOutput
  error?: string
}

export function PlanFeedbackDrawer({ plan, goal }: PlanFeedbackDrawerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [selectedQuick, setSelectedQuick] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleQuick(item: string) {
    setSelectedQuick((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  async function handleSubmit() {
    const combined = [...selectedQuick, feedback].filter(Boolean).join(". ")
    if (!combined) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: combined,
        }),
      })

      const data = (await response.json()) as UpdatePlanResponse
      if (!response.ok) throw new Error(data.error ?? "Failed")

      await savePlan({
        goalId: goal?.id ?? plan.goal_id,
        planOutput: data.plan,
        weekNumber: plan.week_number + 1,
      })

      const message = data.action === "generate_new_plan"
        ? "Generated a new plan based on your last 2 months of logs."
        : "Plan updated based on your last 2 months of logs."
      toast.success(message)
      setIsOpen(false)
      setFeedback("")
      setSelectedQuick([])
      router.refresh()
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="mt-2 w-full gap-2 border-border/80 transition-all duration-300 hover:border-primary/20 hover:bg-primary/5"
        >
          <MessageSquare className="h-4 w-4" />
          Adjust with AI
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <DrawerHeader>
          <DrawerTitle className="font-display text-2xl uppercase tracking-wide">
            How should AI adjust your plan?
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_FEEDBACK.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleQuick(item)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm transition-all duration-300",
                  selectedQuick.includes(item)
                    ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-xs uppercase tracking-wider text-muted-foreground">
              Additional details
            </Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what to change..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[80px] bg-background/50 focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>
        </div>
        <DrawerFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!feedback && selectedQuick.length === 0)}
            className="group relative h-12 overflow-hidden shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Adjusting..." : "Update My Plan"}
            </span>
            <div className="btn-shimmer absolute inset-0" />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
