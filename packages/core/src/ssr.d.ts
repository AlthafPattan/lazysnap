/**
 * Returns true when running in a browser environment.
 * Guards against SSR contexts (Next.js, Angular Universal, etc.)
 */
export declare function isBrowser(): boolean;
/**
 * Returns true when IntersectionObserver is available.
 * Falls back to eager loading when not available (older browsers, SSR).
 */
export declare function hasIntersectionObserver(): boolean;
//# sourceMappingURL=ssr.d.ts.map