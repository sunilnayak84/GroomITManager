
import * as React from "react"
import { type ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
}

interface State {
  toasts: ToasterToast[]
}

const memoryState: State = { toasts: [] }

interface ToastFunction {
  (props: ToastProps): { id: string; dismiss: () => void; update: (props: ToasterToast) => void };
  success(message: string): void;
  error(message: string): void;
}

const toast = ((props: ToastProps) => {
  const id = Math.random().toString(36).slice(2)
  const update = (props: ToasterToast) => {
    memoryState.toasts = memoryState.toasts.map((t) =>
      t.id === id ? { ...t, ...props } : t
    )
  }
  const dismiss = () => {
    memoryState.toasts = memoryState.toasts.filter((t) => t.id !== id)
  }
  
  memoryState.toasts = [
    { id, ...props },
    ...memoryState.toasts
  ].slice(0, TOAST_LIMIT)

  return {
    id,
    dismiss,
    update,
  }
}) as ToastFunction

toast.success = (message: string) => {
  toast({ title: "Success", description: message, variant: "default" })
}

toast.error = (message: string) => {
  toast({ title: "Error", description: message, variant: "destructive" })
}

export { toast }

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(memoryState)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        memoryState.toasts = memoryState.toasts.filter((t) => t.id !== toastId)
      } else {
        memoryState.toasts = []
      }
    },
  }
}
