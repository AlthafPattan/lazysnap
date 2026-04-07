import type { LazysnapDefaults, LazysnapOptions } from "./types.js";
export declare const GLOBAL_DEFAULTS: Required<LazysnapDefaults>;
/**
 * Override global defaults for all lazysnap instances.
 * Call this once at app startup before any images are observed.
 */
export declare function configure(overrides: LazysnapDefaults): void;
/**
 * Resolve final options for an entry, merging global defaults with
 * per-instance options. Per-instance values always win.
 */
export declare function resolveOptions(options: LazysnapOptions): Required<LazysnapOptions>;
//# sourceMappingURL=defaults.d.ts.map