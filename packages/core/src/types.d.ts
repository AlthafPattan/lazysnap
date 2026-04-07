/**
 * Configuration for a single lazy-loaded image instance.
 */
export interface LazysnapOptions {
    /**
     * The full-resolution image src to load once visible.
     */
    src: string;
    /**
     * Optional srcset string for responsive images.
     * e.g. "image-480w.jpg 480w, image-800w.jpg 800w"
     */
    srcset?: string;
    /**
     * Optional sizes attribute for responsive image selection.
     * e.g. "(max-width: 600px) 480px, 800px"
     */
    sizes?: string;
    /**
     * A low-quality image placeholder (LQIP) src or base64 data URI.
     * Displayed immediately while the real image loads.
     */
    placeholder?: string;
    /**
     * Pixel color or CSS value shown as background while loading,
     * used as a fallback when no placeholder is provided.
     * @default "transparent"
     */
    placeholderColor?: string;
    /**
     * Duration of the blur-up fade transition in milliseconds.
     * Set to 0 to disable the animation.
     * @default 400
     */
    transitionDuration?: number;
    /**
     * IntersectionObserver root margin — controls how far outside the
     * viewport an image starts loading. Accepts CSS margin syntax.
     * @default "0px 0px 200px 0px"
     */
    rootMargin?: string;
    /**
     * IntersectionObserver threshold (0–1). Fraction of the target
     * element that must be visible before loading starts.
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
     * Called when the high-res image has fully loaded and rendered.
     */
    onLoad?: (entry: LazysnapEntry) => void;
    /**
     * Called when the image fails to load after all retries are exhausted.
     */
    onError?: (entry: LazysnapEntry, error: Error) => void;
    /**
     * Called when the element enters the viewport and loading begins.
     */
    onVisible?: (entry: LazysnapEntry) => void;
}
/**
 * Represents a tracked lazy image instance.
 */
export interface LazysnapEntry {
    /** The observed HTMLImageElement */
    element: HTMLImageElement;
    /** Resolved options for this entry */
    options: Required<LazysnapOptions>;
    /** Current loading state */
    state: LazysnapState;
    /** Number of load attempts made */
    attempts: number;
}
/**
 * Possible states for a lazy image.
 */
export type LazysnapState = "idle" | "loading" | "loaded" | "error";
/**
 * Return value of `observe()` — a cleanup function to stop observing.
 */
export type LazysnapCleanup = () => void;
/**
 * Global defaults that apply to all observed images unless overridden per-instance.
 */
export interface LazysnapDefaults {
    rootMargin?: string;
    threshold?: number | number[];
    transitionDuration?: number;
    placeholderColor?: string;
    retries?: number;
    retryDelay?: number;
}
//# sourceMappingURL=types.d.ts.map