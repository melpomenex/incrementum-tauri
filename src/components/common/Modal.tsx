/**
 * Modal dialog and confirmation system
 */

import { create } from "zustand";
import { ReactNode, useCallback, useEffect, useRef } from "react";

/**
 * Modal type
 */
export enum ModalType {
  Info = "info",
  Success = "success",
  Warning = "warning",
  Error = "error",
  Confirm = "confirm",
  Custom = "custom",
}

/**
 * Modal options
 */
export interface ModalOptions {
  type?: ModalType;
  title?: string;
  message?: string;
  content?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
  closable?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Modal state
 */
interface ModalState {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  content?: ReactNode;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  closable: boolean;
  size: "sm" | "md" | "lg" | "xl" | "full";
  resolve?: (value: boolean) => void;
}

/**
 * Modal store
 */
interface ModalStore {
  modal: ModalState;
  showModal: (options: ModalOptions) => Promise<boolean>;
  hideModal: () => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  modal: {
    visible: false,
    type: ModalType.Info,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    variant: "default",
    closable: true,
    size: "md",
  },

  showModal: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        modal: {
          visible: true,
          type: options.type || ModalType.Info,
          title: options.title || "",
          message: options.message || "",
          content: options.content,
          confirmText: options.confirmText || "OK",
          cancelText: options.cancelText || "Cancel",
          variant: options.variant || "default",
          closable: options.closable !== false,
          size: options.size || "md",
          resolve,
        },
      });
    });
  },

  hideModal: () => {
    const { modal } = get();
    modal.resolve?.(false);
    set({ modal: { ...modal, visible: false } });
  },
}));

/**
 * Modal component
 */
export function Modal() {
  const { modal, hideModal } = useModalStore();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    modal.resolve?.(true);
    hideModal();
  };

  const handleCancel = () => {
    modal.resolve?.(false);
    hideModal();
  };

  const handleClose = () => {
    if (modal.closable) {
      handleCancel();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal.visible) {
        handleClose();
      }
    };

    if (modal.visible) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [modal.visible, modal.closable]);

  // Focus management
  useEffect(() => {
    if (modal.visible && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      firstElement?.focus();

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTab);
      return () => document.removeEventListener("keydown", handleTab);
    }
  }, [modal.visible]);

  if (!modal.visible) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-6xl",
  };

  const typeIcons = {
    [ModalType.Info]: (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [ModalType.Success]: (
      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [ModalType.Warning]: (
      <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    [ModalType.Error]: (
      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [ModalType.Confirm]: (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [ModalType.Custom]: null,
  };

  const isConfirm = modal.type === ModalType.Confirm || modal.type === ModalType.Custom;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative ${sizeClasses[modal.size]} w-full mx-4 bg-card rounded-lg shadow-2xl border border-border`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-6">
          {typeIcons[modal.type]}
          <div className="flex-1">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-foreground"
            >
              {modal.title}
            </h2>
            {modal.message && (
              <p className="mt-2 text-sm text-muted-foreground">
                {modal.message}
              </p>
            )}
          </div>
          {modal.closable && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Custom Content */}
        {modal.content && (
          <div className="px-6 pb-6">
            {modal.content}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/30 border-t border-border rounded-b-lg">
          {isConfirm && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
            >
              {modal.cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              modal.variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : modal.variant === "warning"
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {modal.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal helper hooks
 */
export function useModal() {
  const { showModal } = useModalStore();

  return {
    alert: useCallback(
      (message: string, title?: string) => {
        return showModal({
          type: ModalType.Info,
          title: title || "Info",
          message,
          confirmText: "OK",
        });
      },
      [showModal]
    ),

    confirm: useCallback(
      (message: string, title?: string, options?: Partial<ModalOptions>) => {
        return showModal({
          type: ModalType.Confirm,
          title: title || "Confirm",
          message,
          confirmText: options?.confirmText || "OK",
          cancelText: options?.cancelText || "Cancel",
          variant: options?.variant,
        });
      },
      [showModal]
    ),

    prompt: useCallback(
      (message: string, defaultValue = "", title?: string) => {
        return new Promise<string | null>((resolve) => {
          let value = defaultValue;

          showModal({
            type: ModalType.Custom,
            title: title || "Prompt",
            message,
            content: (
              <input
                type="text"
                defaultValue={defaultValue}
                onChange={(e) => (value = e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            ),
            confirmText: "OK",
            cancelText: "Cancel",
          }).then((result) => {
            resolve(result ? value : null);
          });
        });
      },
      [showModal]
    ),

    success: useCallback(
      (message: string, title?: string) => {
        return showModal({
          type: ModalType.Success,
          title: title || "Success",
          message,
          confirmText: "OK",
        });
      },
      [showModal]
    ),

    warning: useCallback(
      (message: string, title?: string) => {
        return showModal({
          type: ModalType.Warning,
          title: title || "Warning",
          message,
          confirmText: "OK",
        });
      },
      [showModal]
    ),

    error: useCallback(
      (message: string, title?: string) => {
        return showModal({
          type: ModalType.Error,
          title: title || "Error",
          message,
          confirmText: "OK",
        });
      },
      [showModal]
    ),

    custom: useCallback(
      (content: ReactNode, options: ModalOptions = {}) => {
        return showModal({
          type: ModalType.Custom,
          ...options,
          content,
        });
      },
      [showModal]
    ),
  };
}

/**
 * Modal provider
 */
export function ModalProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Modal />
    </>
  );
}

/**
 * Confirmation dialog component
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCancel();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        className="relative max-w-md w-full mx-4 bg-card rounded-lg shadow-2xl border border-border"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-6">
          <h3 id="confirm-title" className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p id="confirm-message" className="mt-2 text-sm text-muted-foreground">
            {message}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/30 border-t border-border rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : variant === "warning"
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Alert dialog component
 */
export function AlertDialog({
  open,
  title,
  message,
  buttonText = "OK",
  type = ModalType.Info,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  buttonText?: string;
  type?: ModalType;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  const typeIcons = {
    [ModalType.Info]: "text-blue-500",
    [ModalType.Success]: "text-green-500",
    [ModalType.Warning]: "text-yellow-500",
    [ModalType.Error]: "text-red-500",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative max-w-md w-full mx-4 bg-card rounded-lg shadow-2xl border border-border"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 p-6">
          <div className={`flex-shrink-0 ${typeIcons[type]}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-muted/30 border-t border-border rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
