import React from "react";
import { useLazyImage, type UseLazyImageOptions } from "./useLazyImage.js";
import type { LazysnapEntry } from "@lazysnap/core";

// ── Conflict resolution ────────────────────────────────────────────────────
//
// React.ImgHTMLAttributes<HTMLImageElement> contains props that collide with
// @lazysnap options but have different signatures:
//
//   native onLoad  : React.ReactEventHandler<HTMLImageElement>
//   lazysnap onLoad: (entry: LazysnapEntry) => void            ← different
//
//   native onError : React.ReactEventHandler<HTMLImageElement>
//   lazysnap onError:(entry: LazysnapEntry, error: Error) => void ← different
//
//   native srcSet  : string (React camelCase)
//   lazysnap srcset: string (lowercase — matches Angular + core API)
//
//   native sizes   : string — lazysnap takes ownership of this
//   native loading : string — we expose with a narrowed union type
//
// Strategy: Omit all conflicting keys from ImgHTMLAttributes, then re-declare
// with the correct signatures below. TypeScript will only see one definition.

type ConflictingNativeProps =
  | "src"      // lazysnap manages src on the DOM element
  | "srcSet"   // native camelCase — lazysnap uses lowercase srcset
  | "sizes"    // lazysnap controls responsive sizes
  | "onLoad"   // different signature: (entry) vs SyntheticEvent
  | "onError"  // different signature: (entry, error) vs SyntheticEvent
  | "loading"; // re-declared below with a narrowed union + documentation

type SafeImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  ConflictingNativeProps
>;

/**
 * All props accepted by <LazyImage />.
 *
 * Combines:
 * - All @lazysnap/core options (src, placeholder, retries, callbacks, etc.)
 * - Safe native <img> attributes (width, height, style, className, decoding, etc.)
 * - Component-specific props (loadedClassName, errorClassName, fallback, eager)
 *
 * Where native img and lazysnap prop names conflict, lazysnap wins —
 * see onLoad, onError, sizes, and srcset.
 */
export interface LazyImageProps extends UseLazyImageOptions, SafeImgProps {
  // ── Required ──────────────────────────────────────────────────────────────

  /**
   * Full-resolution image URL.
   * @lazysnap/core defers fetching this until the element enters the viewport.
   */
  src: string;

  /**
   * Accessible alt text. Always required — use alt="" for decorative images
   * to signal intentional omission to screen readers.
   */
  alt: string;

  // ── lazysnap core options ─────────────────────────────────────────────────

  /**
   * Low-quality image placeholder (LQIP) — a tiny pre-blurred version of the
   * image, or a base64 data URI. Shown immediately while the full image loads.
   * Keeps layout stable and provides visual feedback on slow connections.
   */
  placeholder?: string;

  /**
   * Background color shown while loading when no placeholder is provided.
   * Accepts any valid CSS color value.
   * @default "transparent"
   */
  placeholderColor?: string;

  /**
   * Responsive srcset string passed to the underlying <img> once the full
   * image has loaded. Uses lowercase "srcset" (not React's camelCase "srcSet")
   * to match @lazysnap/core's API consistently across React and Angular.
   * @example "image-480w.jpg 480w, image-1200w.jpg 1200w"
   */
  srcset?: string;

  /**
   * Responsive sizes attribute — controls which srcset entry the browser picks.
   * Passed through to the <img> element after the image loads.
   * @example "(max-width: 600px) 100vw, 50vw"
   */
  sizes?: string;

  /**
   * Duration of the blur-up fade transition in milliseconds.
   * Set to 0 to disable the animation entirely.
   * @default 400
   */
  transitionDuration?: number;

  /**
   * IntersectionObserver rootMargin — how far before the image enters the
   * viewport loading should begin. Increase to preload earlier.
   * @default "0px 0px 200px 0px"
   */
  rootMargin?: string;

  /**
   * IntersectionObserver threshold — fraction of the element (0–1) that must
   * be visible before loading begins.
   * @default 0
   */
  threshold?: number | number[];

  /**
   * Number of times to retry loading a failed image before giving up.
   * @default 2
   */
  retries?: number;

  /**
   * Delay in milliseconds between retry attempts.
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Called when the full-resolution image has fully loaded and the blur-up
   * transition is complete. Receives a LazysnapEntry with timing breakdown,
   * network connection info, and natural image dimensions.
   *
   * This replaces the native <img> onLoad (which passes a SyntheticEvent).
   * If you need the SyntheticEvent, access it via a ref instead.
   */
  onLoad?: (entry: LazysnapEntry) => void;

  /**
   * Called after all retry attempts are exhausted. Receives the LazysnapEntry
   * (attempt count, connection info) and the final Error object.
   *
   * This replaces the native <img> onError (which passes a SyntheticEvent).
   */
  onError?: (entry: LazysnapEntry, error: Error) => void;

  /**
   * Called when the image element enters the viewport and loading begins.
   * Use for analytics: scroll depth, viewport reach, time-to-visible.
   */
  onVisible?: (entry: LazysnapEntry) => void;

  /**
   * When true, skips IntersectionObserver and loads the image immediately.
   * Use for above-the-fold images (LCP candidates) that must load as fast
   * as possible. Combine with fetchpriority="high" for LCP optimization.
   * @default false
   */
  eager?: boolean;

  // ── Browser loading and priority hints ────────────────────────────────────

  /**
   * Native browser loading hint.
   *
   * With lazysnap, this prop is almost always unnecessary:
   * - Omit it entirely and let lazysnap's IntersectionObserver control loading.
   * - Use eager={true} instead of loading="eager" for above-the-fold images.
   * - Do NOT use loading="lazy" alongside lazysnap — redundant and may conflict.
   *
   * The only valid use case here is loading="eager" on SSR-rendered images where
   * the browser's preload scanner should discover the src before JS hydrates.
   */
  loading?: "eager" | "lazy";

  /**
   * Image decode hint. "async" allows the browser to decode off the main thread,
   * preventing jank during image swap-in. Recommended for all lazy images.
   * @default "async"
   */
  decoding?: "async" | "sync" | "auto";

  /**
   * Fetch priority hint for the browser resource scheduler.
   * Use "high" on LCP images (typically hero images above the fold) to boost
   * their priority over other network requests.
   *
   * Requires eager={true} to have any effect — the browser only prioritizes
   * fetches it has started. Ignored by browsers that don't support Priority Hints.
   * @example fetchpriority="high" eager
   */
  fetchpriority?: "high" | "low" | "auto";

  // ── Component-specific ────────────────────────────────────────────────────

  /**
   * CSS class name added to the <img> when the full-resolution image has
   * successfully loaded. Use for CSS-driven reveal animations.
   * @example loadedClassName="product-image--loaded"
   */
  loadedClassName?: string;

  /**
   * CSS class name added to the <img> when all retry attempts have failed.
   * Use to display a styled broken-image state.
   * @example errorClassName="product-image--error"
   */
  errorClassName?: string;

  /**
   * Content rendered alongside the <img> while the image is loading (state
   * is "idle" or "loading") and not yet in an error state. Typically a
   * skeleton component. Wrap both in a positioned container:
   *
   * ```tsx
   * <div style={{ position: "relative" }}>
   *   <LazyImage
   *     src="/photo.jpg"
   *     alt="Photo"
   *     fallback={<Skeleton style={{ position: "absolute", inset: 0 }} />}
   *   />
   * </div>
   * ```
   */
  fallback?: React.ReactNode;
}

/**
 * Drop-in lazy image component backed by @lazysnap/core.
 *
 * Renders an <img> that loads only when scrolled into view, with LQIP
 * blur-up, configurable retry-on-failure, and full observability callbacks.
 * Forwards refs to the underlying <img> element.
 *
 * @example
 * ```tsx
 * // Product grid image — LQIP, srcset, retries, error monitoring
 * <LazyImage
 *   src="/products/jacket.jpg"
 *   placeholder="/products/jacket-lqip.jpg"
 *   srcset="/products/jacket-480.jpg 480w, /products/jacket-1200.jpg 1200w"
 *   sizes="(max-width: 600px) 100vw, 400px"
 *   alt="Leather jacket"
 *   width={800}
 *   height={600}
 *   retries={3}
 *   decoding="async"
 *   loadedClassName="img--loaded"
 *   fallback={<ProductSkeleton />}
 *   onError={(entry, err) => monitor.capture(err, { src: entry.options.src })}
 *   style={{ width: "100%", height: "auto", display: "block" }}
 * />
 *
 * // Hero / LCP image — load immediately, high fetch priority
 * <LazyImage
 *   src="/hero.jpg"
 *   placeholder="/hero-lqip.jpg"
 *   alt="Hero"
 *   eager
 *   fetchpriority="high"
 *   decoding="async"
 *   width={1920}
 *   height={1080}
 *   style={{ width: "100%", height: "auto" }}
 * />
 * ```
 */
export const LazyImage = React.forwardRef<HTMLImageElement, LazyImageProps>(
  function LazyImage(props, forwardedRef) {
    const {
      // lazysnap / hook options
      src,
      srcset,
      sizes,
      placeholder,
      placeholderColor,
      transitionDuration,
      rootMargin,
      threshold,
      retries,
      retryDelay,
      onLoad,
      onError,
      onVisible,
      eager,
      // component-specific
      loadedClassName,
      errorClassName,
      fallback,
      // native img props we handle explicitly
      className,
      style,
      decoding = "async",
      fetchpriority,
      loading,
      // remaining safe native img props forwarded as-is
      ...imgProps
    } = props;

    const { ref: internalRef, state, isLoaded, isError } = useLazyImage({
      src,
      srcset,
      sizes,
      placeholder,
      placeholderColor,
      transitionDuration,
      rootMargin,
      threshold,
      retries,
      retryDelay,
      onLoad,
      onError,
      onVisible,
      eager,
    });

    // Merge the forwarded ref with the internal ref so callers that attach
    // ref={myRef} still get the DOM node. useCallback prevents unnecessary
    // re-runs — internalRef is stable for the component lifetime.
    const mergedRef = React.useCallback(
      (node: HTMLImageElement | null) => {
        (internalRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef !== null) {
          forwardedRef.current = node;
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [internalRef]
    );

    const computedClassName =
      [className, isLoaded && loadedClassName, isError && errorClassName]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <>
        <img
          // Safe native props spread first — our explicit props override any conflicts
          {...imgProps}
          ref={mergedRef}
          className={computedClassName}
          style={style}
          decoding={decoding}
          data-lazysnap-state={state}
          // Conditionally spread browser hint props — avoids passing undefined
          // attributes to the DOM which would show up in the HTML as "undefined"
          {...(loading      !== undefined ? { loading }      : {})}
          {...(fetchpriority !== undefined ? { fetchpriority } : {})}
          // alt is required by LazyImageProps — always set explicitly after spread
          // so it is never shadowed by anything in imgProps
          alt={props.alt}
          // src, srcSet, sizes are intentionally absent —
          // @lazysnap/core writes these directly to the DOM element via the ref
        />
        {fallback !== undefined && !isLoaded && !isError ? fallback : null}
      </>
    );
  }
);

LazyImage.displayName = "LazyImage";
