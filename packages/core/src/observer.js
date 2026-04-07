/**
 * Observer pool — reuses IntersectionObserver instances that share
 * the same rootMargin + threshold configuration, reducing overhead
 * when many images use identical settings.
 */
const pool = new Map();
function poolKey(rootMargin, threshold) {
    return `${rootMargin}|${JSON.stringify(threshold)}`;
}
/**
 * Observe an element, invoking `callback` when it intersects.
 * Reuses an existing IntersectionObserver if one with matching
 * options already exists in the pool.
 *
 * Returns a cleanup function that unobserves the element.
 */
export function observeElement(element, rootMargin, threshold, callback) {
    const key = poolKey(rootMargin, threshold);
    let poolEntry = pool.get(key);
    if (!poolEntry) {
        const callbacks = new Map();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const cb = callbacks.get(entry.target);
                if (cb)
                    cb(entry);
            }
        }, { rootMargin, threshold });
        poolEntry = { observer, callbacks };
        pool.set(key, poolEntry);
    }
    poolEntry.callbacks.set(element, callback);
    poolEntry.observer.observe(element);
    return () => {
        if (!poolEntry)
            return;
        poolEntry.observer.unobserve(element);
        poolEntry.callbacks.delete(element);
        // Clean up the pool entry if no elements remain
        if (poolEntry.callbacks.size === 0) {
            poolEntry.observer.disconnect();
            pool.delete(key);
        }
    };
}
//# sourceMappingURL=observer.js.map