import type { LazysnapEntry } from "./types.js";
/**
 * Applies the placeholder state to an image element.
 * Sets background color and LQIP src if provided, and
 * initialises the blur filter for the blur-up transition.
 */
export declare function applyPlaceholder(entry: LazysnapEntry): void;
/**
 * Loads the full-resolution image off-screen, then swaps it in
 * and triggers the blur-up transition. Handles retries internally.
 */
export declare function loadImage(entry: LazysnapEntry): void;
//# sourceMappingURL=loader.d.ts.map