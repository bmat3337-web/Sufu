import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2 } from "lucide-react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Always-mounted live region so SR users hear toast updates */}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-8"
      >
        {message && (
          <div className="animate-pop-in pointer-events-auto flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-white shadow-xl shadow-charcoal/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
