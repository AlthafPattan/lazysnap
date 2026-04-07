/**
 * Observer pool — reuses IntersectionObserver instances that share
 * the same rootMargin + threshold configuration, reducing overhead
 * when many images use identical settings.
 */
type ObserverCallback = (entry: IntersectionObserverEntry) => void;
/**
 * Observe an element, invoking `callback` when it intersects.
 * Reuses an existing IntersectionObserver if one with matching
 * options already exists in the pool.
 *
 * Returns a cleanup function that unobserves the element.
 */
export declare function observeElement(element: Element, rootMargin: string, threshold: number | number[], callback: ObserverCallback): () => void;
export {};
//# sourceMappingURL=observer.d.ts.map