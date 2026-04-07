import type { LazysnapTiming } from "../types.js";

/**
 * Creates a fresh timing record stamped at the moment observe() is called.
 */
export function createTiming(): LazysnapTiming {
  return {
    observedAt:    performance.now(),
    visibleAt:     null,
    loadedAt:      null,
    timeToLoad:    null,
    timeToVisible: null,
  };
}

/**
 * Stamps the visible timestamp and computes timeToVisible.
 * Mutates the timing record in place.
 */
export function markVisible(timing: LazysnapTiming): void {
  timing.visibleAt     = performance.now();
  timing.timeToVisible = Math.round(timing.visibleAt - timing.observedAt);
}

/**
 * Stamps the loaded timestamp and computes timeToLoad.
 * timeToLoad is the primary user-facing metric: visible → loaded latency.
 */
export function markLoaded(timing: LazysnapTiming): void {
  timing.loadedAt   = performance.now();
  timing.timeToLoad = timing.visibleAt !== null
    ? Math.round(timing.loadedAt - timing.visibleAt)
    : null;
}

/**
 * Emits native browser performance marks and measures so image load
 * timelines appear in DevTools Performance panel and PerformanceObserver.
 *
 * Called ONCE after load completes — at that point both visibleAt and
 * loadedAt are set, so we can emit both marks and the measure in one pass.
 *
 * Marks emitted:
 *   lazysnap:visible:{filename}      — when element entered viewport
 *   lazysnap:loaded:{filename}       — when full-res image finished loading
 *
 * Measure emitted:
 *   lazysnap:load-duration:{filename} — visible → loaded span
 *
 * Uses startTime fallback for Safari < 16.4 which does not support
 * the PerformanceMarkOptions overload of performance.mark().
 */
export function emitPerformanceMarks(src: string, timing: LazysnapTiming): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") return;
  if (timing.visibleAt === null || timing.loadedAt === null) return;

  // Use filename portion of src as the key — keeps mark names short and readable
  const key = src.split("/").pop()?.split("?")[0] ?? src.slice(-40);

  const visibleMark = `lazysnap:visible:${key}`;
  const loadedMark  = `lazysnap:loaded:${key}`;
  const measureName = `lazysnap:load-duration:${key}`;

  try {
    // Attempt the modern API with startTime first
    // Falls back to markName-only form for Safari < 16.4
    try {
      performance.mark(visibleMark, { startTime: timing.visibleAt });
      performance.mark(loadedMark,  { startTime: timing.loadedAt });
    } catch {
      // Safari < 16.4: startTime option not supported — marks land at "now"
      // This means DevTools timestamps will be approximate, not exact.
      // Acceptable degradation — the measure duration is still accurate
      // because both marks are created in sequence with the same offset.
      performance.mark(visibleMark);
      performance.mark(loadedMark);
    }

    performance.measure(measureName, visibleMark, loadedMark);
  } catch {
    // Swallow entirely — performance instrumentation must never affect loading
  }
}
