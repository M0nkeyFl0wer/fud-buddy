
import { 
  Toast,
  ToastClose, 
  ToastDescription, 
  ToastProvider, 
  ToastTitle, 
  ToastViewport,
  type ToastProps, 
  type ToastActionElement
} from "@/components/ui/toast";

import { useState, useEffect, createContext, useContext } from "react";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

type ToasterState = {
  toasts: ToasterToast[];
};

const ToasterContext = createContext<{
  toasts: ToasterToast[];
  addToast: (toast: ToasterToast) => void;
  removeToast: (toastId?: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  const { toasts, addToast, removeToast } = useContext(ToasterContext);

  return {
    toasts,
    toast: (props: Omit<ToasterToast, "id">) => {
      addToast({ ...props, id: crypto.randomUUID() });
    },
    dismiss: (toastId?: string) => removeToast(toastId),
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToasterState>({
    toasts: [],
  });

  const addToast = (toast: ToasterToast) => {
    setState((prev) => {
      const newToasts = [...prev.toasts];
      if (newToasts.length >= TOAST_LIMIT) {
        newToasts.shift();
      }
      return { toasts: [...newToasts, toast] };
    });
  };

  const removeToast = (toastId?: string) => {
    if (toastId) {
      setState((prev) => ({
        toasts: prev.toasts.filter((t) => t.id !== toastId),
      }));
    }
  };

  return (
    <ToasterContext.Provider value={{ toasts: state.toasts, addToast, removeToast }}>
      {children}
    </ToasterContext.Provider>
  );
}

// Simple toast function for direct usage
export const toast = {
  success: (message: string) => {
    const { toast } = useToast();
    toast({ 
      title: "Success", 
      description: message,
      variant: "default" 
    });
  },
  error: (message: string) => {
    const { toast } = useToast();
    toast({ 
      title: "Error", 
      description: message,
      variant: "destructive" 
    });
  }
};
