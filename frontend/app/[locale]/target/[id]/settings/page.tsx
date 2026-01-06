"use client"

import { useParams } from "next/navigation"
import { TargetSettings } from "@/components/target/target-settings"

/**
 * Target settings page
 * Contains blacklist configuration and other settings
 */
export default function TargetSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const targetId = Number(id)

  return (
    <div className="px-4 lg:px-6">
      <TargetSettings targetId={targetId} />
    </div>
  )
}
