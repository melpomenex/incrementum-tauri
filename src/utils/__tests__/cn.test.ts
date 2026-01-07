/**
 * Tests for cn utility function
 */

import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar");
  });

  it("should handle undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should merge Tailwind classes with conflicting properties", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("should handle objects with boolean values", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle all falsey conditions", () => {
    expect(cn(false, 0, "", null, undefined)).toBe("");
  });
});
