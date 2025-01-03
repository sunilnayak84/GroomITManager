
import { toast as hookToast } from "@/hooks/use-toast"

export type ToastType = 'success' | 'error' | 'warning' | 'info'

const DEFAULT_DURATION = 3000

interface ToastOptions {
  title?: string
  description: string
  type?: ToastType
  duration?: number
}

export function toast({ title, description, type = 'info', duration = DEFAULT_DURATION }: ToastOptions) {
  return hookToast({
    title: title || type.charAt(0).toUpperCase() + type.slice(1),
    description,
    variant: type === 'error' ? 'destructive' : 'default',
    duration
  })
}

export { useToast } from "@/hooks/use-toast"
