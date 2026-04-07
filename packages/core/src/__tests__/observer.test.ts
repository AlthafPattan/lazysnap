/**
 * @lazysnap/core — observer.test.ts
 *
 * Tests for the shared IntersectionObserver pool.
 */

import { observeElement } from "../src/observer.js";

// ─── Mock IntersectionObserver ────────────────────────────────────────────────

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly callback: IOCallback;
  readonly options: IntersectionObserverInit;
  observed: Set<Element> = new Set();

  constructor(callback: IOCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); }

  /** Simulate an intersection event for a given element */
  triggerIntersection(el: Element, isIntersecting: boolean) {
    this.callback([
      {
        target: el,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      } as IntersectionObserverEntry,
    ]);
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  // @ts-expect-error — replace global with mock
  globalThis.IntersectionObserver = MockIntersectionObserver;
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
  // @ts-expect-error
  globalThis.document = {};
});

afterEach(() => {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.document;
  // @ts-expect-error
  delete globalThis.IntersectionObserver;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("observeElement()", () => {
  const makeElement = () => document.createElement?.("img") ?? ({ id: Math.random() } as unknown as HTMLImageElement);

  it("creates a new IntersectionObserver for a new rootMargin/threshold combo", () => {
    const el = {} as Element;
    const cleanup = observeElement(el, "0px", 0, () => {});

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    cleanup();
  });

  it("reuses the same observer for elements with identical options", () => {
    const el1 = { id: "a" } as unknown as Element;
    const el2 = { id: "b" } as unknown as Element;

    const c1 = observeElement(el1, "0px 0px 200px 0px", 0, () => {});
    const c2 = observeElement(el2, "0px 0px 200px 0px", 0, () => {});

    expect(MockIntersectionObserver.instances).toHaveLength(1);

    c1();
    c2();
  });

  it("creates separate observers for different rootMargin values", () => {
    const el1 = { id: "a" } as unknown as Element;
    const el2 = { id: "b" } as unknown as Element;

    const c1 = observeElement(el1, "0px", 0, () => {});
    const c2 = observeElement(el2, "100px", 0, () => {});

    expect(MockIntersectionObserver.instances).toHaveLength(2);

    c1();
    c2();
  });

  it("invokes the callback when intersection is triggered", () => {
    const el = { id: "test" } as unknown as Element;
    const callback = jest.fn();

    const cleanup = observeElement(el, "0px", 0, callback);
    const observer = MockIntersectionObserver.instances[0]!;

    observer.triggerIntersection(el, true);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]![0].isIntersecting).toBe(true);

    cleanup();
  });

  it("removes the element from the pool on cleanup", () => {
    const el = { id: "test" } as unknown as Element;
    const cleanup = observeElement(el, "0px", 0, () => {});

    cleanup();

    // After cleanup, another observe on same options should create a fresh observer
    const el2 = { id: "test2" } as unknown as Element;
    const c2 = observeElement(el2, "0px", 0, () => {});

    expect(MockIntersectionObserver.instances).toHaveLength(2);
    c2();
  });

  it("does not invoke callback for unregistered elements", () => {
    const el1 = { id: "a" } as unknown as Element;
    const el2 = { id: "b" } as unknown as Element;
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const c1 = observeElement(el1, "0px", 0, callback1);
    const c2 = observeElement(el2, "0px", 0, callback2);

    const observer = MockIntersectionObserver.instances[0]!;
    observer.triggerIntersection(el1, true);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    c1();
    c2();
  });
});
