import type { LazysnapEntry } from "./types.js";
import { markLoaded, emitPerformanceMarks } from "./observability/timing.js";

/**
 * Applies the placeholder state to an image element.
 * Sets background color and LQIP src if provided, and
 * initialises the blur filter for the blur-up transition.
 */
export function applyPlaceholder(entry: LazysnapEntry): void {
  const { element, options } = entry;
  const { placeholder, placeholderColor, transitionDuration } = options;

  element.style.backgroundColor = placeholderColor;

  if (transitionDuration > 0) {
    element.style.transition = `filter ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease`;
    element.style.filter     = placeholder ? "blur(10px)" : "none";
    element.style.willChange = "filter, opacity";
  }

  if (placeholder) {
    element.src = placeholder;
    if (options.sizes) element.sizes = options.sizes;
  }
}

/**
 * Loads the full-resolution image off-screen, then swaps it in and triggers
 * the blur-up transition. Captures timing, natural dimensions, and handles
 * retries with configurable backoff.
 *
 * Performance marks are emitted here — after load — because this is the
 * only point where both visibleAt and loadedAt are populated.
 */
export function loadImage(entry: LazysnapEntry): void {
  const { element, options } = entry;
  entry.state    = "loading";
  entry.attempts += 1;

  const img = new Image();
  if (options.srcset) img.srcset = options.srcset;
  if (options.sizes)  img.sizes  = options.sizes;

  img.onload = () => {
    // ── Timing ─────────────────────────────────────────────────────
    markLoaded(entry.timing);

    // ── Dimensions ─────────────────────────────────────────────────
    // naturalWidth/Height on the off-screen Image object are set
    // synchronously after onload fires, before any rAF
    entry.dimensions = {
      width:  img.naturalWidth,
      height: img.naturalHeight,
    };

    // ── DOM swap ────────────────────────────────────────────────────
    if (options.srcset) element.srcset = options.srcset;
    if (options.sizes)  element.sizes  = options.sizes;
    element.src = options.src;

    // Blur-up: clear filter after browser paints the new src
    requestAnimationFrame(() => {
      element.style.filter     = "none";
      element.style.willChange = "auto";
    });

    entry.state = "loaded";
    element.setAttribute("data-lazysnap", "loaded");

    // ── Performance marks ───────────────────────────────────────────
    // Called here (not in observe.ts) so both visibleAt + loadedAt
    // are set — the measure requires both marks to exist
    emitPerformanceMarks(options.src, entry.timing);

    options.onLoad(entry);
  };

  img.onerror = () => {
    if (entry.attempts <= options.retries) {
      setTimeout(() => loadImage(entry), options.retryDelay);
    } else {
      entry.state = "error";
      element.setAttribute("data-lazysnap", "error");
      options.onError(
        entry,
        new Error(
          `@lazysnap/core: Failed to load image after ${entry.attempts} attempt(s): ${options.src}`
        )
      );
    }
  };

  img.src = options.src;
}
