import type {
  LazysnapAnalyticsEvent,
  LazysnapAnalyticsHandler,
  LazysnapAnalyticsOptions,
  LazysnapEntry,
  LazysnapOptions,
} from "../types.js";
import { isBrowser } from "../ssr.js";

/**
 * Builds a normalized analytics event from a lifecycle entry.
 * Shallow-copies all mutable fields so the event payload is immutable
 * by the time it reaches a handler.
 */
export function buildAnalyticsEvent(
  eventName: LazysnapAnalyticsEvent["event"],
  entry: LazysnapEntry,
  errorMessage?: string
): LazysnapAnalyticsEvent {
  return {
    event:       eventName,
    src:         entry.options.src,
    url:         entry.options.src,
    state:       entry.state,
    attempts:    entry.attempts,
    timing:      { ...entry.timing },
    connection:  { ...entry.connection },
    dimensions:  entry.dimensions !== null ? { ...entry.dimensions } : null,
    timestamp:   new Date().toISOString(),
    ...(errorMessage !== undefined && { errorMessage }),
  };
}

// ── Batcher ────────────────────────────────────────────────────────────────

class EventBatcher {
  private buffer: LazysnapAnalyticsEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxSize: number;
  private readonly maxWaitMs: number;
  private readonly onFlush: (events: LazysnapAnalyticsEvent[]) => void;

  constructor(
    maxSize: number,
    maxWaitMs: number,
    onFlush: (events: LazysnapAnalyticsEvent[]) => void
  ) {
    this.maxSize   = maxSize;
    this.maxWaitMs = maxWaitMs;
    this.onFlush   = onFlush;
  }

  push(event: LazysnapAnalyticsEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.maxSize) {
      this.drain();
    } else if (this.timer === null) {
      this.timer = setTimeout(() => this.drain(), this.maxWaitMs);
    }
  }

  drain(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    if (this.buffer.length === 0) return;
    this.onFlush(this.buffer.splice(0));
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Creates lifecycle callbacks that pipe image events to an analytics
 * handler with built-in sampling, batching, and enrichment.
 *
 * Spread the result into configure() to instrument every image globally:
 *
 * ```ts
 * configure({
 *   rootMargin: "0px 0px 300px 0px",
 *   ...createAnalyticsPlugin({
 *     handler:    createSegmentHandler(analytics),
 *     sampleRate: 0.1,
 *     events:     ["image_loaded", "image_error"],
 *     batch:      { maxSize: 20, maxWaitMs: 2000 },
 *     enrichEvent: (e) => ({ ...e, page: window.location.pathname }),
 *   }),
 * });
 * ```
 *
 * Or pass into a specific observe() call for per-image tracking:
 *
 * ```ts
 * observe(img, {
 *   src: "/hero.jpg",
 *   ...createAnalyticsPlugin({ handler: consoleHandler }),
 * });
 * ```
 */
export function createAnalyticsPlugin(
  opts: LazysnapAnalyticsOptions
): Pick<LazysnapOptions, "onVisible" | "onLoad" | "onError"> {
  const {
    handler,
    sampleRate  = 1.0,
    events      = ["image_visible", "image_loaded", "image_error"],
    batch,
    enrichEvent,
  } = opts;

  const wantVisible = events.includes("image_visible");
  const wantLoaded  = events.includes("image_loaded");
  const wantError   = events.includes("image_error");

  // ── Sampling ──────────────────────────────────────────────────────────────
  // The sampling decision is made ONCE per LazysnapEntry object at the first
  // event (onVisible or onError if visible tracking is off), then stored in
  // a WeakSet keyed by the entry object reference.
  //
  // This guarantees: if an image is sampled, ALL its events are tracked.
  // If it is not sampled, NO events for that image are ever sent.
  // A WeakSet holds entries without preventing GC when elements are removed.
  const sampledEntries = new WeakSet<LazysnapEntry>();

  function decideSample(entry: LazysnapEntry): boolean {
    if (sampledEntries.has(entry)) return true;
    if (sampleRate < 1.0 && Math.random() >= sampleRate) return false;
    sampledEntries.add(entry);
    return true;
  }

  // ── Emit path ─────────────────────────────────────────────────────────────
  // Two modes: direct (call handler.track per event) or batched (buffer events,
  // flush on maxSize or maxWaitMs, plus flush on page hide via visibilitychange).
  //
  // NOTE: createBeaconHandler has its own internal buffer — do NOT use batch
  // mode together with createBeaconHandler, or you will double-buffer.
  // beacon handler is self-batching by design (it uses sendBeacon on flush()).

  let emit: (event: LazysnapAnalyticsEvent) => void;

  if (batch) {
    const batcher = new EventBatcher(
      batch.maxSize   ?? 20,
      batch.maxWaitMs ?? 2000,
      (flushed) => flushed.forEach(e => handler.track(e))
    );

    emit = (event) => batcher.push(event);

    // Flush buffered events before the page is backgrounded / closed.
    // visibilitychange with hidden is the most reliable cross-browser signal.
    if (isBrowser()) {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          batcher.drain();
          handler.flush?.();
        }
      }, { once: false, passive: true });
    }
  } else {
    emit = (event) => handler.track(event);
  }

  function send(
    eventName: LazysnapAnalyticsEvent["event"],
    entry: LazysnapEntry,
    errorMessage?: string
  ): void {
    let event = buildAnalyticsEvent(eventName, entry, errorMessage);
    if (enrichEvent) event = enrichEvent(event);
    emit(event);
  }

  // ── Callbacks ─────────────────────────────────────────────────────────────

  return {
    onVisible(entry) {
      if (!wantVisible) return;
      if (!decideSample(entry)) return;
      send("image_visible", entry);
    },

    onLoad(entry) {
      if (!wantLoaded) return;
      // onLoad only fires if this entry was already sampled at onVisible.
      // We do NOT call decideSample() here — if the entry wasn't sampled,
      // it is not in sampledEntries and we skip it cleanly.
      if (!sampledEntries.has(entry)) return;
      send("image_loaded", entry);
    },

    onError(entry, error) {
      if (!wantError) return;
      // For error events we DO call decideSample — an image that failed
      // before becoming visible (e.g. eager load failure) would never have
      // had decideSample called via onVisible. We still want to capture errors.
      if (!decideSample(entry)) return;
      send("image_error", entry, error.message);
    },
  };
}
