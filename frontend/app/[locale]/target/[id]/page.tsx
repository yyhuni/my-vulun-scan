"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Target detail default page
 * Automatically redirects to overview page
 */
export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Redirect to overview page
    router.replace(`/target/${id}/overview/`)
  }, [id, router])

  return null
}

