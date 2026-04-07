/**
 * Configuration for a single lazy-loaded image instance.
 */
export interface LazysnapOptions {
  /** The full-resolution image src to load once visible. */
  src: string;
  /** Optional srcset string for responsive images. */
  srcset?: string;
  /** Optional sizes attribute for responsive image selection. */
  sizes?: string;
  /** A low-quality image placeholder (LQIP) src or base64 data URI. */
  placeholder?: string;
  /** Background color shown while loading. @default "transparent" */
  placeholderColor?: string;
  /** Blur-up fade duration in ms. 0 to disable. @default 400 */
  transitionDuration?: number;
  /** IntersectionObserver rootMargin. @default "0px 0px 200px 0px" */
  rootMargin?: string;
  /** IntersectionObserver threshold. @default 0 */
  threshold?: number | number[];
  /** Retry attempts on load failure. @default 2 */
  retries?: number;
  /** Delay in ms between retries. @default 1000 */
  retryDelay?: number;
  /** Called when the high-res image has fully loaded and rendered. */
  onLoad?: (entry: LazysnapEntry) => void;
  /** Called when the image fails after all retries are exhausted. */
  onError?: (entry: LazysnapEntry, error: Error) => void;
  /** Called when the element enters the viewport and loading begins. */
  onVisible?: (entry: LazysnapEntry) => void;
}

/**
 * Timing breakdown for a single image lifecycle.
 * All values are milliseconds via performance.now().
 */
export interface LazysnapTiming {
  /** When observe() was called and tracking began. */
  observedAt: number;
  /** When the element first entered the viewport. Null until visible. */
  visibleAt: number | null;
  /** When the full-res image finished loading. Null until loaded. */
  loadedAt: number | null;
  /**
   * Time from visible → loaded in ms.
   * The most actionable metric: how long did the user wait?
   * Null until both visibleAt and loadedAt are set.
   */
  timeToLoad: number | null;
  /**
   * Time from observe() → visible in ms.
   * Useful for scroll depth analysis.
   * Null until visible.
   */
  timeToVisible: number | null;
}

/**
 * Network connection info captured at observation time.
 * Based on the Network Information API — may be undefined in some browsers.
 */
export interface LazysnapConnectionInfo {
  /** e.g. "4g", "3g", "2g", "slow-2g" */
  effectiveType: string | undefined;
  /** Estimated downlink in Mbps */
  downlink: number | undefined;
  /** Estimated round-trip time in ms */
  rtt: number | undefined;
  /** Whether the user has requested reduced data usage */
  saveData: boolean | undefined;
}

/**
 * Represents a fully tracked lazy image instance.
 * Passed to all callbacks — this is your observability payload.
 */
export interface LazysnapEntry {
  /** The observed HTMLImageElement */
  element: HTMLImageElement;
  /** Resolved options for this entry */
  options: Required<LazysnapOptions>;
  /** Current loading state */
  state: LazysnapState;
  /** Total load attempts made (includes retries) */
  attempts: number;
  /** Timing breakdown — updated at each lifecycle stage */
  timing: LazysnapTiming;
  /** Network info captured when observation began */
  connection: LazysnapConnectionInfo;
  /**
   * Natural dimensions of the loaded image in pixels.
   * Populated only after successful load.
   */
  dimensions: { width: number; height: number } | null;
}

/** Possible states for a lazy image. */
export type LazysnapState =
  | "idle"      // not yet visible
  | "loading"   // fetching full-res image
  | "loaded"    // fully loaded and visible
  | "error";    // failed after all retries

/** Return value of observe() — a cleanup function to stop observing. */
export type LazysnapCleanup = () => void;

/** Global defaults that apply to all observed images unless overridden per-instance. */
export interface LazysnapDefaults {
  rootMargin?: string;
  threshold?: number | number[];
  transitionDuration?: number;
  placeholderColor?: string;
  retries?: number;
  retryDelay?: number;
}

// ── Observability types ────────────────────────────────────────────────────

/**
 * The normalized event payload emitted to every analytics handler.
 * Designed to map cleanly to Segment, Amplitude, Mixpanel, or custom endpoints.
 */
export interface LazysnapAnalyticsEvent {
  /** Event name — one of three well-defined lifecycle events */
  event: "image_visible" | "image_loaded" | "image_error";
  /** The image src that was being loaded */
  src: string;
  /** Alias for src — useful for Segment's standard properties */
  url: string;
  /** Current state at event time */
  state: LazysnapState;
  /** How many load attempts were made */
  attempts: number;
  /** Full timing breakdown */
  timing: LazysnapTiming;
  /** Network conditions at observation time */
  connection: LazysnapConnectionInfo;
  /** Natural image dimensions — null for error/visible events */
  dimensions: { width: number; height: number } | null;
  /** ISO timestamp of event */
  timestamp: string;
  /** Error message — only present on image_error events */
  errorMessage?: string;
}

/**
 * A pluggable analytics handler.
 * Implement this interface to connect @lazysnap to any analytics provider.
 */
export interface LazysnapAnalyticsHandler {
  /** Called for every event that passes sampling */
  track(event: LazysnapAnalyticsEvent): void;
  /** Optional: flush any buffered events (called on page unload) */
  flush?(): void;
}

/**
 * Options for createAnalyticsPlugin().
 */
export interface LazysnapAnalyticsOptions {
  /** The analytics handler to send events to. */
  handler: LazysnapAnalyticsHandler;
  /**
   * Fraction of images to track (0–1).
   * 1.0 = track everything, 0.1 = track 10%.
   * Use lower values on high-traffic pages to control volume.
   * @default 1.0
   */
  sampleRate?: number;
  /**
   * Which events to emit. Omit any to suppress that event type.
   * @default ["image_visible", "image_loaded", "image_error"]
   */
  events?: Array<"image_visible" | "image_loaded" | "image_error">;
  /**
   * Batch events before sending instead of firing one-at-a-time.
   * Useful for high-volume pages (product grids, infinite scroll).
   */
  batch?: {
    /** Max events to buffer before flushing. @default 20 */
    maxSize?: number;
    /** Max time in ms to wait before flushing. @default 2000 */
    maxWaitMs?: number;
  };
  /**
   * Optional function to enrich every event with custom properties.
   * Merge your own metadata (page name, user segment, experiment ID, etc.)
   */
  enrichEvent?: (event: LazysnapAnalyticsEvent) => LazysnapAnalyticsEvent;
}
