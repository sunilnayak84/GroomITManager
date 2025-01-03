
import { toast as hookToast } from "@/hooks/use-toast"

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  title?: string
  description: string
  type?: ToastType
  duration?: number
}

export function toast({ title, description, type = 'info', duration = 3000 }: ToastOptions) {
  return hookToast({
    variant: type === 'error' ? 'destructive' : 'default',
    description,
    title,
    duration,
  })
}

export { useToast } from "@/hooks/use-toast"
