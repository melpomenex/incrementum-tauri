/**
 * Toast notification system
 */

import { create } from "zustand";
import { Check, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * Toast types
 */
export enum ToastType {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info",
}

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast store
 */
interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/**
 * Use toast store
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);

    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => {
    set({ toasts: [] });
  },
}));

/**
 * Toast icons
 */
const ToastIcons = {
  [ToastType.Success]: Check,
  [ToastType.Error]: AlertCircle,
  [ToastType.Warning]: AlertTriangle,
  [ToastType.Info]: Info,
};

/**
 * Toast component
 */
export function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => {
        const Icon = ToastIcons[toast.type];

        return (
          <div
            key={toast.id}
            className={`min-w-80 max-w-md p-4 rounded-lg shadow-lg border flex items-start gap-3 animate-slide-up ${
              toast.type === ToastType.Success
                ? "bg-green-500/10 border-green-500/20 text-green-500"
                : toast.type === ToastType.Error
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : toast.type === ToastType.Warning
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                : "bg-blue-500/10 border-blue-500/20 text-blue-500"
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.message && (
                <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
              )}
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-sm underline mt-1 hover:opacity-80"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hook to show toast notifications
 */
export function useToast() {
  const { addToast } = useToastStore();

  type PromiseFn = <T>(
    promise: Promise<T>,
    success: string,
    error?: string
  ) => Promise<T>;

  const promiseFn: PromiseFn = (promise, success, error) => {
    return promise
      .then((result) => {
        addToast({ type: ToastType.Success, title: success });
        return result;
      })
      .catch((err) => {
        addToast({
          type: ToastType.Error,
          title: error || "An error occurred",
          message: err?.message || String(err),
        });
        throw err;
      });
  };

  return {
    success: (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: ToastType.Success, title, message, ...options });
    },
    error: (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: ToastType.Error, title, message, ...options });
    },
    warning: (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: ToastType.Warning, title, message, ...options });
    },
    info: (title: string, message?: string, options?: Partial<Toast>) => {
      return addToast({ type: ToastType.Info, title, message, ...options });
    },
    promise: promiseFn,
  };
}

/**
 * Toast container provider
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toast />
    </>
  );
}
