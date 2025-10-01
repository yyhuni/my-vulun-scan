"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
<Sonner
  theme={theme as ToasterProps["theme"]}
  className="toaster group"
  duration={2000}
  position="bottom-center"
  richColors  ={false}
  closeButton={false}
  toastOptions={{
    style: {
      background: 'hsl(var(--popover))',
      color: 'hsl(var(--popover-foreground))',
      border: '1px solid hsl(var(--border))',
    },
  }}
  {...props}
/>
  )
}

export { Toaster }
