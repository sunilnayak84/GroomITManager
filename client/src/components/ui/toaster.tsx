
"use client"

import {
  Toast,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastPrimitives.Title className="text-sm font-semibold">{title}</ToastPrimitives.Title>}
              {description && (
                <ToastPrimitives.Description className="text-sm opacity-90">{description}</ToastPrimitives.Description>
              )}
            </div>
            {action}
            <ToastPrimitives.Close className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
              <X className="h-4 w-4" />
            </ToastPrimitives.Close>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
