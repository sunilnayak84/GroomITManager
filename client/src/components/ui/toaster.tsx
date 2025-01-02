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
      {toasts.map(({ id, title, description, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            <div className="text-sm font-semibold">{title || 'Notification'}</div>
            <div className="text-sm opacity-90">{description || 'Action completed'}</div>
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}