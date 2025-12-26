"use client"

import { redirect } from "next/navigation"

/**
 * 指纹管理首页 - 重定向到 EHole
 */
export default function FingerprintsPage() {
  redirect("/tools/fingerprints/ehole/")
}
