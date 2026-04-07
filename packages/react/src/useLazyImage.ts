import { useEffect, useRef, useState } from "react";
import { observe, isBrowser } from "@lazysnap/core";
import type { LazysnapOptions, LazysnapState } from "@lazysnap/core";

export interface UseLazyImageOptions extends LazysnapOptions {
  /**
   * When true, skips IntersectionObserver and loads immediately.
   * Useful for above-the-fold images (LCP candidates).
   * @default false
   */
  eager?: boolean;
}

export interface UseLazyImageResult {
  /**
   * Attach this ref to your <img> element.
   * @lazysnap/core uses it to apply placeholders, observe intersection,
   * and swap in the full-resolution src.
   *
   * ```tsx
   * const { ref } = useLazyImage({ src: "/photo.jpg" });
   * return <img ref={ref} alt="Photo" />;
   * ```
   */
  ref: React.RefObject<HTMLImageElement>;
  /**
   * Current loading state of the image.
   * - "idle"    — not yet in viewport
   * - "loading" — fetch in progress (or retrying)
   * - "loaded"  — full-res image painted
   * - "error"   — all retries exhausted
   */
  state: LazysnapState;
  /** Shorthand for state === "loaded" */
  isLoaded: boolean;
  /** Shorthand for state === "error" — all retries failed */
  isError: boolean;
  /** Shorthand for state === "loading" — fetch in progress */
  isLoading: boolean;
}

/**
 * React hook for lazy-loading a single image with @lazysnap/core.
 *
 * @example
 * ```tsx
 * function HeroImage() {
 *   const { ref, isLoaded } = useLazyImage({
 *     src: "/photos/hero.jpg",
 *     placeholder: "/photos/hero-lqip.jpg",
 *   });
 *
 *   return (
 *     <img
 *       ref={ref}
 *       alt="Hero"
 *       style={{ opacity: isLoaded ? 1 : 0.6 }}
 *     />
 *   );
 * }
 * ```
 */
export function useLazyImage(options: UseLazyImageOptions): UseLazyImageResult {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<LazysnapState>("idle");

  const { eager = false, ...coreOptions } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || !isBrowser()) return;

    if (eager) {
      el.src = coreOptions.src;
      if (coreOptions.srcset) el.srcset = coreOptions.srcset;
      if (coreOptions.sizes) el.sizes = coreOptions.sizes;
      setState("loaded");
      return;
    }

    const cleanup = observe(el, {
      ...coreOptions,
      onLoad: (entry) => {
        setState("loaded");
        coreOptions.onLoad?.(entry);
      },
      onError: (entry, error) => {
        setState("error");
        coreOptions.onError?.(entry, error);
      },
      onVisible: (entry) => {
        setState("loading");
        coreOptions.onVisible?.(entry);
      },
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreOptions.src]);

  return {
    ref,
    state,
    isLoaded:  state === "loaded",
    isError:   state === "error",
    isLoading: state === "loading",
  };
}
