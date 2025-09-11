"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string // 支持导航
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
    disabled?: boolean
  }
  children?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center mb-4 max-w-md">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          href={action.href}
          variant={action.variant || "default"}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
} 