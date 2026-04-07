import { resolveOptions } from "./defaults.js";
import { applyPlaceholder, loadImage } from "./loader.js";
import { observeElement } from "./observer.js";
import { hasIntersectionObserver, isBrowser } from "./ssr.js";
/**
 * Begin lazy-loading an image element.
 *
 * @param element - The <img> element to observe.
 * @param options - Configuration for this lazy image instance.
 * @returns A cleanup function — call it to stop observing the element.
 *
 * @example
 * ```ts
 * import { observe } from "@lazysnap/core";
 *
 * const img = document.querySelector("img")!;
 * const cleanup = observe(img, {
 *   src: "/photos/hero.jpg",
 *   placeholder: "/photos/hero-lqip.jpg",
 *   srcset: "/photos/hero-480.jpg 480w, /photos/hero-800.jpg 800w",
 *   sizes: "(max-width: 600px) 480px, 800px",
 * });
 *
 * // Later, e.g. on component unmount:
 * cleanup();
 * ```
 */
export function observe(element, options) {
    const resolved = resolveOptions(options);
    const entry = {
        element,
        options: resolved,
        state: "idle",
        attempts: 0,
    };
    element.setAttribute("data-lazysnap", "idle");
    // SSR guard — do nothing on the server
    if (!isBrowser()) {
        return () => undefined;
    }
    // Apply placeholder immediately so layout is stable
    applyPlaceholder(entry);
    // No IntersectionObserver support — load eagerly (graceful degradation)
    if (!hasIntersectionObserver()) {
        resolved.onVisible(entry);
        loadImage(entry);
        return () => undefined;
    }
    const unobserve = observeElement(element, resolved.rootMargin, resolved.threshold, (intersectionEntry) => {
        if (!intersectionEntry.isIntersecting)
            return;
        // Stop watching — we only need to load once
        unobserve();
        resolved.onVisible(entry);
        loadImage(entry);
    });
    return unobserve;
}
//# sourceMappingURL=observe.js.map