/**
 * Tests for Toast components
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useToastStore,
  Toast,
  ToastType,
} from "../Toast";

// Use fake timers for tests that need them
vi.useFakeTimers();

describe("Toast Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useToastStore.setState({ toasts: [] });
    vi.clearAllTimers();
  });

  describe("addToast", () => {
    it("should add a toast to the store", () => {
      const { addToast } = useToastStore.getState();

      addToast({ type: ToastType.Success, title: "Success!" });

      const state = useToastStore.getState();
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].title).toBe("Success!");
    });

    it("should create toast with unique ID", () => {
      const { addToast } = useToastStore.getState();

      const id1 = addToast({ type: ToastType.Info, title: "First" });
      const id2 = addToast({ type: ToastType.Info, title: "Second" });

      expect(id1).not.toBe(id2);
    });
  });

  describe("removeToast", () => {
    it("should remove a specific toast", () => {
      const { addToast, removeToast } = useToastStore.getState();

      const id = addToast({ type: ToastType.Error, title: "Error" });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      removeToast(id);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should handle removing non-existent toast gracefully", () => {
      const { addToast, removeToast } = useToastStore.getState();

      addToast({ type: ToastType.Info, title: "Test" });

      // Remove non-existent toast should not throw
      removeToast("non-existent-id");

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe("clearAll", () => {
    it("should clear all toasts", () => {
      const { addToast, clearAll } = useToastStore.getState();

      addToast({ type: ToastType.Success, title: "1" });
      addToast({ type: ToastType.Info, title: "2" });
      addToast({ type: ToastType.Warning, title: "3" });

      expect(useToastStore.getState().toasts).toHaveLength(3);

      clearAll();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});

describe("Toast Component", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.clearAllTimers();
  });

  it("should render nothing when there are no toasts", () => {
    const { container } = render(<Toast />);

    expect(container.firstChild).toBe(null);
  });

  it("should render a toast", () => {
    useToastStore.setState({
      toasts: [
        {
          id: "1",
          type: ToastType.Success,
          title: "Success!",
        },
      ],
    });

    render(<Toast />);

    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("should render toast with message", () => {
    useToastStore.setState({
      toasts: [
        {
          id: "1",
          type: ToastType.Info,
          title: "Title",
          message: "This is a message",
        },
      ],
    });

    render(<Toast />);

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("This is a message")).toBeInTheDocument();
  });

  it("should render multiple toasts", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", type: ToastType.Success, title: "First" },
        { id: "2", type: ToastType.Error, title: "Second" },
      ],
    });

    render(<Toast />);

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("should render different toast types with appropriate styling", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", type: ToastType.Success, title: "Success" },
        { id: "2", type: ToastType.Error, title: "Error" },
        { id: "3", type: ToastType.Warning, title: "Warning" },
        { id: "4", type: ToastType.Info, title: "Info" },
      ],
    });

    render(<Toast />);

    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("should display close button for each toast", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", type: ToastType.Info, title: "Test" },
      ],
    });

    render(<Toast />);

    // Should have at least one button (close button)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
