/**
 * @lazysnap/core — observe.test.ts
 *
 * Integration tests for the main observe() function.
 * Covers: placeholder application, intersection-triggered loading,
 * SSR no-op, blur-up, retry, and callbacks.
 */

import { observe } from "../src/observe.js";

// ─── Mocks ────────────────────────────────────────────────────────────────────

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IOCallback;
  observed: Map<Element, boolean> = new Map();

  constructor(callback: IOCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) { this.observed.set(el, true); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); }

  fire(el: Element, isIntersecting: boolean) {
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

// Track Image loads
let mockImageOnLoad: (() => void) | null = null;
let mockImageOnError: (() => void) | null = null;
let mockImageSrc = "";

class MockImage {
  set src(val: string) {
    mockImageSrc = val;
    // Automatically trigger load unless we want to test error
    if (!val.includes("fail")) {
      Promise.resolve().then(() => mockImageOnLoad?.());
    } else {
      Promise.resolve().then(() => mockImageOnError?.());
    }
  }
  set onload(fn: () => void) { mockImageOnLoad = fn; }
  set onerror(fn: () => void) { mockImageOnError = fn; }
  srcset = "";
  sizes = "";
}

function makeImgElement(): HTMLImageElement {
  return {
    src: "",
    srcset: "",
    sizes: "",
    style: { backgroundColor: "", transition: "", filter: "", willChange: "" },
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
  } as unknown as HTMLImageElement;
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  mockImageOnLoad = null;
  mockImageOnError = null;
  mockImageSrc = "";

  // @ts-expect-error
  globalThis.window = globalThis;
  // @ts-expect-error
  globalThis.document = {};
  // @ts-expect-error
  globalThis.IntersectionObserver = MockIntersectionObserver;
  // @ts-expect-error
  globalThis.Image = MockImage;
  // @ts-expect-error
  globalThis.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0);
});

afterEach(() => {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.document;
  // @ts-expect-error
  delete globalThis.IntersectionObserver;
  // @ts-expect-error
  delete globalThis.Image;
  // @ts-expect-error
  delete globalThis.requestAnimationFrame;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("observe()", () => {
  it("sets data-lazysnap to idle initially", () => {
    const img = makeImgElement();
    observe(img, { src: "/photo.jpg" });
    expect(img.setAttribute).toHaveBeenCalledWith("data-lazysnap", "idle");
  });

  it("applies placeholder background color when no LQIP is given", () => {
    const img = makeImgElement();
    observe(img, { src: "/photo.jpg", placeholderColor: "#eee" });
    expect(img.style.backgroundColor).toBe("#eee");
  });

  it("sets placeholder src when provided", () => {
    const img = makeImgElement();
    observe(img, {
      src: "/photo.jpg",
      placeholder: "/photo-lqip.jpg",
    });
    expect(img.src).toBe("/photo-lqip.jpg");
  });

  it("applies blur filter when placeholder is provided", () => {
    const img = makeImgElement();
    observe(img, {
      src: "/photo.jpg",
      placeholder: "/photo-lqip.jpg",
      transitionDuration: 400,
    });
    expect(img.style.filter).toBe("blur(10px)");
  });

  it("does not apply blur when transitionDuration is 0", () => {
    const img = makeImgElement();
    observe(img, {
      src: "/photo.jpg",
      placeholder: "/photo-lqip.jpg",
      transitionDuration: 0,
    });
    expect(img.style.filter).toBe("");
  });

  it("returns a cleanup function", () => {
    const img = makeImgElement();
    const cleanup = observe(img, { src: "/photo.jpg" });
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });

  it("fires onVisible when element intersects", () => {
    const img = makeImgElement();
    const onVisible = jest.fn();

    observe(img, { src: "/photo.jpg", onVisible });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, true);

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("fires onLoad after intersection and image load", async () => {
    const img = makeImgElement();
    const onLoad = jest.fn();

    observe(img, { src: "/photo.jpg", onLoad });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, true);

    // Wait for Image mock to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("swaps in full-res src after load", async () => {
    const img = makeImgElement();
    observe(img, { src: "/photo.jpg" });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, true);

    await new Promise((r) => setTimeout(r, 10));

    expect(img.src).toBe("/photo.jpg");
    expect(img.setAttribute).toHaveBeenCalledWith("data-lazysnap", "loaded");
  });

  it("unobserves the element after first intersection", () => {
    const img = makeImgElement();
    observe(img, { src: "/photo.jpg" });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, true);

    expect(io.observed.has(img)).toBe(false);
  });

  it("does not re-fire when isIntersecting is false", () => {
    const img = makeImgElement();
    const onVisible = jest.fn();

    observe(img, { src: "/photo.jpg", onVisible });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, false);

    expect(onVisible).not.toHaveBeenCalled();
  });

  it("fires onError after exhausting retries", async () => {
    const img = makeImgElement();
    const onError = jest.fn();

    observe(img, {
      src: "/fail-photo.jpg",
      onError,
      retries: 1,
      retryDelay: 5,
    });

    const io = MockIntersectionObserver.instances[0]!;
    io.fire(img, true);

    // Wait for retries to exhaust
    await new Promise((r) => setTimeout(r, 100));

    expect(onError).toHaveBeenCalledTimes(1);
    const [, error] = onError.mock.calls[0]!;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("fail-photo.jpg");
  });

  it("no-ops and returns noop cleanup in SSR (no window)", () => {
    // @ts-expect-error
    delete globalThis.window;
    // @ts-expect-error
    delete globalThis.document;

    const img = makeImgElement();
    const onLoad = jest.fn();
    const cleanup = observe(img, { src: "/photo.jpg", onLoad });

    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
