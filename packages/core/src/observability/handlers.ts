import type { LazysnapAnalyticsEvent, LazysnapAnalyticsHandler } from "../types.js";

/**
 * Handler for Segment (analytics.js / @segment/analytics-next).
 * Maps lazysnap events to Segment's standard track() signature.
 *
 * @example
 * ```ts
 * import { AnalyticsBrowser } from "@segment/analytics-next";
 * import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/core";
 *
 * const segment = AnalyticsBrowser.load({ writeKey: "YOUR_WRITE_KEY" });
 *
 * configure({
 *   ...createAnalyticsPlugin({
 *     handler:    createSegmentHandler(segment),
 *     sampleRate: 0.1,
 *     events:     ["image_loaded", "image_error"],
 *     batch:      { maxSize: 20, maxWaitMs: 2000 },
 *     enrichEvent: (e) => ({ ...e, page: window.location.pathname }),
 *   }),
 * });
 * ```
 */
export function createSegmentHandler(
  segment: { track: (event: string, properties: Record<string, unknown>) => void }
): LazysnapAnalyticsHandler {
  return {
    track(event: LazysnapAnalyticsEvent): void {
      segment.track(event.event, {
        src:           event.src,
        state:         event.state,
        attempts:      event.attempts,
        timeToLoad:    event.timing.timeToLoad,
        timeToVisible: event.timing.timeToVisible,
        effectiveType: event.connection.effectiveType,
        downlink:      event.connection.downlink,
        rtt:           event.connection.rtt,
        saveData:      event.connection.saveData,
        imageWidth:    event.dimensions?.width ?? null,
        imageHeight:   event.dimensions?.height ?? null,
        errorMessage:  event.errorMessage ?? null,
        timestamp:     event.timestamp,
      });
    },
  };
}

/**
 * Handler for Amplitude (@amplitude/analytics-browser).
 *
 * @example
 * ```ts
 * import * as amplitude from "@amplitude/analytics-browser";
 * import { configure, createAnalyticsPlugin, createAmplitudeHandler } from "@lazysnap/core";
 *
 * amplitude.init("YOUR_API_KEY");
 *
 * configure({
 *   ...createAnalyticsPlugin({
 *     handler: createAmplitudeHandler(amplitude),
 *     sampleRate: 0.2,
 *   }),
 * });
 * ```
 */
export function createAmplitudeHandler(
  amplitude: { track: (eventName: string, eventProperties?: Record<string, unknown>) => void }
): LazysnapAnalyticsHandler {
  return {
    track(event: LazysnapAnalyticsEvent): void {
      amplitude.track(event.event, {
        src:           event.src,
        state:         event.state,
        attempts:      event.attempts,
        timeToLoad:    event.timing.timeToLoad,
        timeToVisible: event.timing.timeToVisible,
        connection:    event.connection.effectiveType,
        saveData:      event.connection.saveData,
        imageWidth:    event.dimensions?.width ?? null,
        imageHeight:   event.dimensions?.height ?? null,
        errorMessage:  event.errorMessage ?? null,
      });
    },
  };
}

/**
 * Color-coded console handler for development and debugging.
 *
 * Prints a one-line summary per event with timing and connection info,
 * plus the full event object in a collapsed group for deep inspection.
 *
 * Outputs:
 *   [lazysnap] image_visible  hero.jpg — entered viewport (scroll depth: 1240ms)
 *   [lazysnap] image_loaded   hero.jpg — 380ms on 4g (1200×800)
 *   [lazysnap] image_error    hero.jpg — Failed after 3 attempts (3g)
 *
 * @example
 * ```ts
 * import { configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";
 *
 * if (process.env.NODE_ENV !== "production") {
 *   configure({
 *     ...createAnalyticsPlugin({ handler: consoleHandler }),
 *   });
 * }
 * ```
 */
export const consoleHandler: LazysnapAnalyticsHandler = {
  track(event: LazysnapAnalyticsEvent): void {
    const styles: Record<LazysnapAnalyticsEvent["event"], string> = {
      image_visible: "color:#a78bfa;font-weight:bold",
      image_loaded:  "color:#22c55e;font-weight:bold",
      image_error:   "color:#ef4444;font-weight:bold",
    };

    const filename = event.src.split("/").pop()?.split("?")[0] ?? event.src;
    const conn     = event.connection.effectiveType ?? "unknown";

    let summary: string;
    if (event.event === "image_loaded") {
      const dims = event.dimensions ? ` (${event.dimensions.width}×${event.dimensions.height})` : "";
      summary = `${filename} — ${event.timing.timeToLoad}ms on ${conn}${dims}`;
    } else if (event.event === "image_error") {
      summary = `${filename} — ${event.errorMessage} after ${event.attempts} attempt(s) on ${conn}`;
    } else {
      const scrollDepth = event.timing.timeToVisible !== null
        ? ` (scroll depth: ${event.timing.timeToVisible}ms)`
        : "";
      summary = `${filename} — entered viewport${scrollDepth}`;
    }

    // Use groupCollapsed so the detail is accessible but doesn't flood the console
    console.groupCollapsed(
      `%c[lazysnap] ${event.event.padEnd(15)}%c ${summary}`,
      styles[event.event],
      "color:inherit"
    );
    console.log("timing",     event.timing);
    console.log("connection", event.connection);
    if (event.dimensions) console.log("dimensions", event.dimensions);
    if (event.errorMessage) console.log("error", event.errorMessage);
    console.log("full event", event);
    console.groupEnd();
  },
};

/**
 * No-op handler — useful for disabling tracking in tests or feature flags
 * without changing call sites.
 *
 * @example
 * ```ts
 * configure({
 *   ...createAnalyticsPlugin({
 *     handler: isTrackingEnabled ? createSegmentHandler(segment) : noopHandler,
 *   }),
 * });
 * ```
 */
export const noopHandler: LazysnapAnalyticsHandler = {
  track: () => undefined,
  flush: () => undefined,
};

/**
 * Posts events to a custom HTTP endpoint using navigator.sendBeacon
 * on page hide (guaranteed delivery) with a fetch() fallback.
 *
 * This handler is self-batching — it buffers internally and flushes
 * via its flush() method. Do NOT combine with createAnalyticsPlugin's
 * batch option, or events will be double-buffered.
 *
 * Correct usage:
 * ```ts
 * configure({
 *   ...createAnalyticsPlugin({
 *     handler: createBeaconHandler("/api/image-analytics"),
 *     // No batch: {} here — beacon handler manages its own buffer
 *   }),
 * });
 * ```
 *
 * Your endpoint receives:
 * ```json
 * { "events": [ ...LazysnapAnalyticsEvent[] ] }
 * ```
 */
export function createBeaconHandler(
  endpoint: string,
  options: {
    /** Extra headers for the fetch() fallback (sendBeacon ignores headers) */
    headers?: Record<string, string>;
    /**
     * Max events to buffer before auto-flushing.
     * @default 50
     */
    maxBufferSize?: number;
  } = {}
): LazysnapAnalyticsHandler {
  const { headers = {}, maxBufferSize = 50 } = options;
  const buffer: LazysnapAnalyticsEvent[] = [];

  function flush(): void {
    if (buffer.length === 0) return;
    const payload = JSON.stringify({ events: buffer.splice(0) });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // sendBeacon: fire-and-forget, survives page unload, no CORS preflight on POST
      const blob = new Blob([payload], { type: "application/json" });
      const queued = navigator.sendBeacon(endpoint, blob);
      if (!queued) {
        // sendBeacon returns false if the queue is full — fall back to fetch
        fallbackFetch(payload);
      }
    } else {
      fallbackFetch(payload);
    }
  }

  function fallbackFetch(payload: string): void {
    fetch(endpoint, {
      method:    "POST",
      headers:   { "Content-Type": "application/json", ...headers },
      body:      payload,
      keepalive: true, // survives page navigation in supported browsers
    }).catch(() => undefined); // swallow — analytics must not throw
  }

  return {
    track(event: LazysnapAnalyticsEvent): void {
      buffer.push(event);
      if (buffer.length >= maxBufferSize) flush();
    },
    flush,
  };
}
