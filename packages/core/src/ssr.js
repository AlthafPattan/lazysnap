/**
 * Returns true when running in a browser environment.
 * Guards against SSR contexts (Next.js, Angular Universal, etc.)
 */
export function isBrowser() {
    return typeof window !== "undefined" && typeof document !== "undefined";
}
/**
 * Returns true when IntersectionObserver is available.
 * Falls back to eager loading when not available (older browsers, SSR).
 */
export function hasIntersectionObserver() {
    return isBrowser() && "IntersectionObserver" in window;
}
//# sourceMappingURL=ssr.js.map