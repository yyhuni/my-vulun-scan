"use client"

import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import type { Icon } from "@tabler/icons-react"

export interface Step {
  id: number
  title: string
  description?: string
  icon?: Icon
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

/**
 * 步骤指示器组件
 * 显示多步骤流程的当前进度
 */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative">
      {/* 连接线背景 */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" style={{ left: '5%', right: '5%' }} />
      
      <div className="relative flex items-start justify-between">
        {steps.map((step, index) => {
          const StepIconComponent = step.icon
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isUpcoming = currentStep < step.id
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* 步骤圆圈 */}
              <div
                className={cn(
                  "relative flex items-center justify-center size-10 rounded-full border-2 transition-all duration-200",
                  isCompleted && "bg-primary border-primary text-primary-foreground shadow-sm",
                  isCurrent && "border-primary bg-background text-primary ring-4 ring-primary/10",
                  isUpcoming && "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <IconCheck className="size-5" />
                ) : StepIconComponent ? (
                  <StepIconComponent className="size-5" />
                ) : (
                  <span className="font-semibold text-sm">{step.id}</span>
                )}
              </div>
              
              {/* 步骤信息 */}
              <div className="mt-3 text-center max-w-[120px]">
                <div
                  className={cn(
                    "text-sm font-medium leading-tight",
                    (isCurrent || isCompleted) && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    {step.description}
                  </div>
                )}
              </div>
              
              {/* 进度连接线 */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 h-0.5 transition-all duration-300",
                    isCompleted && "bg-primary"
                  )}
                  style={{
                    left: `${(100 / steps.length) * (index + 0.5)}%`,
                    width: `${100 / steps.length}%`,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
