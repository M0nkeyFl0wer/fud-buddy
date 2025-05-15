
// Re-export from the actual toast component
import { useToast as useToastHook, toast as toastFunction } from "@radix-ui/react-toast";

export const useToast = useToastHook;
export const toast = toastFunction;
