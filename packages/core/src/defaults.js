export const GLOBAL_DEFAULTS = {
    rootMargin: "0px 0px 200px 0px",
    threshold: 0,
    transitionDuration: 400,
    placeholderColor: "transparent",
    retries: 2,
    retryDelay: 1000,
};
let _globalOverrides = {};
/**
 * Override global defaults for all lazysnap instances.
 * Call this once at app startup before any images are observed.
 */
export function configure(overrides) {
    _globalOverrides = { ..._globalOverrides, ...overrides };
}
/**
 * Resolve final options for an entry, merging global defaults with
 * per-instance options. Per-instance values always win.
 */
export function resolveOptions(options) {
    const merged = { ...GLOBAL_DEFAULTS, ..._globalOverrides };
    return {
        src: options.src,
        srcset: options.srcset ?? "",
        sizes: options.sizes ?? "",
        placeholder: options.placeholder ?? "",
        placeholderColor: options.placeholderColor ?? merged.placeholderColor,
        transitionDuration: options.transitionDuration ?? merged.transitionDuration,
        rootMargin: options.rootMargin ?? merged.rootMargin,
        threshold: options.threshold ?? merged.threshold,
        retries: options.retries ?? merged.retries,
        retryDelay: options.retryDelay ?? merged.retryDelay,
        onLoad: options.onLoad ?? (() => undefined),
        onError: options.onError ?? (() => undefined),
        onVisible: options.onVisible ?? (() => undefined),
    };
}
//# sourceMappingURL=defaults.js.map