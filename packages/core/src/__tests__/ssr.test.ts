/**
 * @lazysnap/core — ssr.test.ts
 *
 * Tests for SSR environment guards.
 * These run in Node (no window/document), simulating a server context.
 */

import { isBrowser, hasIntersectionObserver } from "../src/ssr.js";

// --- isBrowser ---

describe("isBrowser()", () => {
  it("returns false in a Node/SSR environment", () => {
    // In a Node test runner, window is undefined
    expect(isBrowser()).toBe(false);
  });
});

// --- hasIntersectionObserver ---

describe("hasIntersectionObserver()", () => {
  it("returns false when not in a browser", () => {
    expect(hasIntersectionObserver()).toBe(false);
  });

  it("returns false when browser but IntersectionObserver is absent", () => {
    // Simulate browser-like globals without IO
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    // @ts-expect-error — intentionally mocking globals
    globalThis.window = {};
    // @ts-expect-error
    globalThis.document = {};

    expect(hasIntersectionObserver()).toBe(false);

    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });
});
