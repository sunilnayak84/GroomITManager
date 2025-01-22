"use client"

import { Toaster as RadixToaster } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <RadixToaster>
      {toasts.map(({ id, title, description, ...props }) => (
        <div key={id} {...props}>
          {title && <div className="font-semibold">{title}</div>}
          {description && <div>{description}</div>}
        </div>
      ))}
    </RadixToaster>
  )
}