
import { useToast } from "@/components/ui/use-toast"

export function useToastMessage() {
  const { toast } = useToast()

  return {
    success: (message: string) => {
      toast({
        title: "Success",
        description: message,
      })
    },
    error: (message: string) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
    }
  }
}
