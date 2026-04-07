import type { LazysnapDefaults, LazysnapOptions } from "./types.js";

export const GLOBAL_DEFAULTS: Required<LazysnapDefaults> = {
  rootMargin:         "0px 0px 200px 0px",
  threshold:          0,
  transitionDuration: 400,
  placeholderColor:   "transparent",
  retries:            2,
  retryDelay:         1000,
};

// Separate store for global callback overrides (analytics plugin output)
let _globalOverrides: LazysnapDefaults = {};
let _globalCallbacks: Pick<LazysnapOptions, "onVisible" | "onLoad" | "onError"> = {};

/**
 * Override global defaults and/or set global lifecycle callbacks.
 *
 * Call once at app startup. Per-instance options always win over globals.
 * Callbacks are merged — both the global and per-instance callback fire.
 *
 * @example
 * ```ts
 * // Wire analytics globally — every image reports automatically
 * configure({
 *   rootMargin: "0px 0px 300px 0px",
 *   ...createAnalyticsPlugin({ handler: segmentHandler, sampleRate: 0.1 }),
 * });
 * ```
 */
export function configure(
  overrides: LazysnapDefaults & Pick<LazysnapOptions, "onVisible" | "onLoad" | "onError">
): void {
  const { onVisible, onLoad, onError, ...rest } = overrides;
  _globalOverrides = { ..._globalOverrides, ...rest };
  _globalCallbacks = {
    onVisible: onVisible ?? _globalCallbacks.onVisible,
    onLoad:    onLoad    ?? _globalCallbacks.onLoad,
    onError:   onError   ?? _globalCallbacks.onError,
  };
}

/**
 * Resolve final options for an entry, merging global defaults with
 * per-instance options. Per-instance values always win.
 * Callbacks are composed: global fires first, then per-instance.
 */
export function resolveOptions(options: LazysnapOptions): Required<LazysnapOptions> {
  const merged = { ...GLOBAL_DEFAULTS, ..._globalOverrides };

  // Compose callbacks — global handler fires first, then per-instance
  // This ensures analytics always runs regardless of per-image callbacks
  const onLoad = compose(_globalCallbacks.onLoad, options.onLoad);
  const onError = composeError(_globalCallbacks.onError, options.onError);
  const onVisible = compose(_globalCallbacks.onVisible, options.onVisible);

  return {
    src:                options.src,
    srcset:             options.srcset             ?? "",
    sizes:              options.sizes              ?? "",
    placeholder:        options.placeholder        ?? "",
    placeholderColor:   options.placeholderColor   ?? merged.placeholderColor,
    transitionDuration: options.transitionDuration ?? merged.transitionDuration,
    rootMargin:         options.rootMargin         ?? merged.rootMargin,
    threshold:          options.threshold          ?? merged.threshold,
    retries:            options.retries            ?? merged.retries,
    retryDelay:         options.retryDelay         ?? merged.retryDelay,
    onLoad,
    onError,
    onVisible,
  };
}

/** @internal Reset globals — used in tests only */
export function _resetGlobals(): void {
  _globalOverrides = {};
  _globalCallbacks = {};
}

// ── Helpers ────────────────────────────────────────────────────────────────

type EntryCallback = Required<LazysnapOptions>["onLoad"];
type ErrorCallback = Required<LazysnapOptions>["onError"];

function compose(
  global: EntryCallback | undefined,
  local: EntryCallback | undefined
): EntryCallback {
  if (!global && !local) return () => undefined;
  if (!global) return local!;
  if (!local)  return global;
  return (entry) => { global(entry); local(entry); };
}

function composeError(
  global: ErrorCallback | undefined,
  local: ErrorCallback | undefined
): ErrorCallback {
  if (!global && !local) return () => undefined;
  if (!global) return local!;
  if (!local)  return global;
  return (entry, error) => { global(entry, error); local(entry, error); };
}
