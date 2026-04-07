import type { LazysnapCleanup, LazysnapOptions } from "./types.js";
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
export declare function observe(element: HTMLImageElement, options: LazysnapOptions): LazysnapCleanup;
//# sourceMappingURL=observe.d.ts.map