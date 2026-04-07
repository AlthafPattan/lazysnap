// ── Core API ───────────────────────────────────────────────────────────────
export { observe }    from "./observe.js";
export { configure }  from "./defaults.js";

// ── Observability ──────────────────────────────────────────────────────────
export { createAnalyticsPlugin }  from "./observability/analytics.js";
export { buildAnalyticsEvent }    from "./observability/analytics.js";
export { captureConnection }      from "./observability/connection.js";
export { createTiming, markVisible, markLoaded, emitPerformanceMarks } from "./observability/timing.js";

// ── Built-in analytics handlers ────────────────────────────────────────────
export {
  createSegmentHandler,
  createAmplitudeHandler,
  createBeaconHandler,
  consoleHandler,
  noopHandler,
} from "./observability/handlers.js";

// ── SSR utilities ──────────────────────────────────────────────────────────
export { isBrowser, hasIntersectionObserver } from "./ssr.js";

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  LazysnapOptions,
  LazysnapEntry,
  LazysnapState,
  LazysnapCleanup,
  LazysnapDefaults,
  LazysnapTiming,
  LazysnapConnectionInfo,
  LazysnapAnalyticsEvent,
  LazysnapAnalyticsHandler,
  LazysnapAnalyticsOptions,
} from "./types.js";
