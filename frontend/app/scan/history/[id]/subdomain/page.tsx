"use client"

import React from "react"
import { useParams } from "next/navigation"
import { SubdomainsDetailView } from "@/components/subdomains"

export default function ScanHistorySubdomainPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <SubdomainsDetailView targetId={parseInt(id)} />
    </div>
  )
}
