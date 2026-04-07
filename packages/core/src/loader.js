/**
 * Applies the placeholder state to an image element.
 * Sets background color and LQIP src if provided, and
 * initialises the blur filter for the blur-up transition.
 */
export function applyPlaceholder(entry) {
    const { element, options } = entry;
    const { placeholder, placeholderColor, transitionDuration } = options;
    element.style.backgroundColor = placeholderColor;
    if (transitionDuration > 0) {
        element.style.transition = `filter ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease`;
        element.style.filter = placeholder ? "blur(10px)" : "none";
        element.style.willChange = "filter, opacity";
    }
    if (placeholder) {
        element.src = placeholder;
        if (options.sizes)
            element.sizes = options.sizes;
    }
}
/**
 * Loads the full-resolution image off-screen, then swaps it in
 * and triggers the blur-up transition. Handles retries internally.
 */
export function loadImage(entry) {
    const { element, options } = entry;
    entry.state = "loading";
    entry.attempts += 1;
    const img = new Image();
    if (options.srcset)
        img.srcset = options.srcset;
    if (options.sizes)
        img.sizes = options.sizes;
    img.onload = () => {
        // Swap in the full-res image
        if (options.srcset) {
            element.srcset = options.srcset;
        }
        if (options.sizes) {
            element.sizes = options.sizes;
        }
        element.src = options.src;
        // Trigger blur-up: remove blur after a micro-tick so the
        // browser has painted the new src first
        requestAnimationFrame(() => {
            element.style.filter = "none";
            element.style.willChange = "auto";
        });
        entry.state = "loaded";
        element.setAttribute("data-lazysnap", "loaded");
        options.onLoad(entry);
    };
    img.onerror = () => {
        if (entry.attempts <= options.retries) {
            setTimeout(() => loadImage(entry), options.retryDelay);
        }
        else {
            entry.state = "error";
            element.setAttribute("data-lazysnap", "error");
            options.onError(entry, new Error(`@lazysnap/core: Failed to load image after ${entry.attempts} attempt(s): ${options.src}`));
        }
    };
    img.src = options.src;
}
//# sourceMappingURL=loader.js.map