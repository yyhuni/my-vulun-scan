"use client"

import React from "react"
import { useParams } from "next/navigation"
import { EndpointsDetailView } from "@/components/endpoints"

export default function ScanHistoryEndpointsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <EndpointsDetailView targetId={parseInt(id)} />
    </div>
  )
}
