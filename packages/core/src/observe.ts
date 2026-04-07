import type { LazysnapCleanup, LazysnapEntry, LazysnapOptions } from "./types.js";
import { resolveOptions } from "./defaults.js";
import { applyPlaceholder, loadImage } from "./loader.js";
import { observeElement } from "./observer.js";
import { hasIntersectionObserver, isBrowser } from "./ssr.js";
import { captureConnection } from "./observability/connection.js";
import { createTiming, markVisible } from "./observability/timing.js";

const SSR_TIMING = Object.freeze({
  observedAt: 0, visibleAt: null, loadedAt: null,
  timeToLoad: null, timeToVisible: null,
});

const SSR_CONNECTION = Object.freeze({
  effectiveType: undefined, downlink: undefined,
  rtt: undefined, saveData: undefined,
});

/**
 * Begin lazy-loading an image element.
 *
 * @param element - The <img> element to observe.
 * @param options - Configuration for this lazy image instance.
 * @returns A cleanup function — call it to stop observing the element.
 *
 * @example
 * ```ts
 * import { observe, configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";
 *
 * // Wire up global observability once at app startup
 * configure({
 *   ...createAnalyticsPlugin({
 *     handler: consoleHandler,
 *     sampleRate: 1.0,
 *     events: ["image_loaded", "image_error"],
 *   }),
 * });
 *
 * const img = document.querySelector("img")!;
 * const cleanup = observe(img, { src: "/photos/hero.jpg" });
 * // Later: cleanup();
 * ```
 */
export function observe(
  element: HTMLImageElement,
  options: LazysnapOptions
): LazysnapCleanup {
  const resolved = resolveOptions(options);
  const inBrowser = isBrowser();

  const entry: LazysnapEntry = {
    element,
    options:    resolved,
    state:      "idle",
    attempts:   0,
    // SSR gets frozen sentinel objects — never mutated on the server
    timing:     inBrowser ? createTiming() : { ...SSR_TIMING },
    connection: inBrowser ? captureConnection() : { ...SSR_CONNECTION },
    dimensions: null,
  };

  element.setAttribute("data-lazysnap", "idle");

  // SSR guard — no DOM, no observer, no network calls
  if (!inBrowser) return () => undefined;

  // Apply placeholder immediately so layout is stable before first paint
  applyPlaceholder(entry);

  // No IntersectionObserver — load eagerly (graceful degradation for old browsers)
  if (!hasIntersectionObserver()) {
    markVisible(entry.timing);
    resolved.onVisible(entry);
    loadImage(entry);
    return () => undefined;
  }

  const unobserve = observeElement(
    element,
    resolved.rootMargin,
    resolved.threshold,
    (intersectionEntry) => {
      if (!intersectionEntry.isIntersecting) return;

      unobserve(); // unobserve before callbacks — prevents double-fire on rapid scroll

      markVisible(entry.timing); // stamp visibleAt before onVisible fires
      resolved.onVisible(entry);
      loadImage(entry);          // performance marks emitted inside loadImage after load
    }
  );

  return unobserve;
}
