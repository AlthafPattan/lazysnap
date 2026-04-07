/**
 * @lazysnap/core — defaults.test.ts
 *
 * Tests for configure() and resolveOptions().
 */

import { configure, resolveOptions, GLOBAL_DEFAULTS } from "../src/defaults.js";
import type { LazysnapOptions } from "../src/types.js";

const minimalOptions: LazysnapOptions = {
  src: "https://example.com/photo.jpg",
};

describe("GLOBAL_DEFAULTS", () => {
  it("has expected default values", () => {
    expect(GLOBAL_DEFAULTS.rootMargin).toBe("0px 0px 200px 0px");
    expect(GLOBAL_DEFAULTS.threshold).toBe(0);
    expect(GLOBAL_DEFAULTS.transitionDuration).toBe(400);
    expect(GLOBAL_DEFAULTS.placeholderColor).toBe("transparent");
    expect(GLOBAL_DEFAULTS.retries).toBe(2);
    expect(GLOBAL_DEFAULTS.retryDelay).toBe(1000);
  });
});

describe("resolveOptions()", () => {
  it("fills all optional fields with defaults when only src is given", () => {
    const resolved = resolveOptions(minimalOptions);

    expect(resolved.src).toBe(minimalOptions.src);
    expect(resolved.srcset).toBe("");
    expect(resolved.sizes).toBe("");
    expect(resolved.placeholder).toBe("");
    expect(resolved.placeholderColor).toBe("transparent");
    expect(resolved.transitionDuration).toBe(400);
    expect(resolved.rootMargin).toBe("0px 0px 200px 0px");
    expect(resolved.threshold).toBe(0);
    expect(resolved.retries).toBe(2);
    expect(resolved.retryDelay).toBe(1000);
    expect(typeof resolved.onLoad).toBe("function");
    expect(typeof resolved.onError).toBe("function");
    expect(typeof resolved.onVisible).toBe("function");
  });

  it("per-instance values override defaults", () => {
    const resolved = resolveOptions({
      src: "https://example.com/photo.jpg",
      transitionDuration: 800,
      retries: 5,
      rootMargin: "0px",
    });

    expect(resolved.transitionDuration).toBe(800);
    expect(resolved.retries).toBe(5);
    expect(resolved.rootMargin).toBe("0px");
    // Other fields still use defaults
    expect(resolved.threshold).toBe(0);
  });

  it("callbacks are no-ops by default (do not throw when called)", () => {
    const resolved = resolveOptions(minimalOptions);
    const fakeEntry = {} as Parameters<typeof resolved.onLoad>[0];

    expect(() => resolved.onLoad(fakeEntry)).not.toThrow();
    expect(() => resolved.onVisible(fakeEntry)).not.toThrow();
    expect(() => resolved.onError(fakeEntry, new Error("test"))).not.toThrow();
  });

  it("preserves user-supplied callbacks", () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    const onVisible = jest.fn();

    const resolved = resolveOptions({
      src: "https://example.com/photo.jpg",
      onLoad,
      onError,
      onVisible,
    });

    const fakeEntry = {} as Parameters<typeof resolved.onLoad>[0];
    resolved.onLoad(fakeEntry);
    resolved.onError(fakeEntry, new Error("oops"));
    resolved.onVisible(fakeEntry);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });
});

describe("configure()", () => {
  afterEach(() => {
    // Reset global overrides after each test by re-importing
    // In a real setup, you'd expose a reset() or use module mocking
  });

  it("overrides apply to subsequently resolved options", () => {
    configure({ transitionDuration: 999, retries: 10 });

    const resolved = resolveOptions(minimalOptions);

    expect(resolved.transitionDuration).toBe(999);
    expect(resolved.retries).toBe(10);
  });

  it("per-instance options still win over configure() overrides", () => {
    configure({ transitionDuration: 999 });

    const resolved = resolveOptions({
      ...minimalOptions,
      transitionDuration: 100,
    });

    expect(resolved.transitionDuration).toBe(100);
  });

  it("merges multiple configure() calls additively", () => {
    configure({ retries: 5 });
    configure({ retryDelay: 2000 });

    const resolved = resolveOptions(minimalOptions);

    expect(resolved.retries).toBe(5);
    expect(resolved.retryDelay).toBe(2000);
  });
});
