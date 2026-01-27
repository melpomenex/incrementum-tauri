/**
 * Common Components Index
 * Reusable UI components for Incrementum
 */

// Feedback & Notifications
export { Toast, ToastProvider, useToast, ToastType } from "./Toast";
// Note: ReviewFeedback is in ../review/ReviewFeedback, import from there
// export { ReviewFeedback, useReviewFeedback } from "../review/ReviewFeedback";

// Loading States
export {
  Skeleton,
  DocumentCardSkeleton,
  DocumentGridSkeleton,
  ReviewCardSkeleton,
  ImportDialogSkeleton,
  StatCardSkeleton,
  QueueListSkeleton,
} from "./Skeleton";

// Empty States
export {
  EmptyState,
  EmptyDocuments,
  EmptyQueue,
  EmptySearch,
  EmptyAnalytics,
  EmptyReview,
  EmptyExtracts,
} from "./EmptyState";

// Navigation & Layout
export { Breadcrumb, useBreadcrumb } from "./Breadcrumb";
export { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

// Performance
export { VirtualList, useVirtualList, DynamicVirtualList } from "./VirtualList";

// Modals & Overlays
export {
  Modal,
  useModal,
  ModalProvider,
  ConfirmDialog,
  AlertDialog,
  ModalType,
} from "./Modal";

// Command Palette
export {
  CommandPalette,
  CommandPaletteProvider,
  useCommandPalette,
  createCommand,
  getDefaultCommands,
  CommandCategory,
  useCommandPaletteShortcut,
} from "./CommandPalette";
