
import { ToasterToast } from "@/components/ui/toaster"

type ToastProps = React.ComponentProps<typeof Toast>

interface Toast extends ToastProps {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  const createToast = ({ ...props }: Toast) => {
    const { title, description, variant = "default", ...rest } = props;
    return toast({
      title,
      description,
      variant,
      ...rest,
    });
  };

  return {
    toast: createToast,
    toast: function (props: Toast) {
      const { title, description, variant = "default", ...rest } = props;
      return createToast({
        title,
        description,
        variant,
        ...rest
      });
    },
  };
}
