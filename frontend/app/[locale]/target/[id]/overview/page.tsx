"use client"

import { useParams } from "next/navigation"
import { TargetOverview } from "@/components/target/target-overview"

/**
 * Target overview page
 * Displays target statistics and summary information
 */
export default function TargetOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const targetId = Number(id)

  return (
    <div className="px-4 lg:px-6">
      <TargetOverview targetId={targetId} />
    </div>
  )
}
