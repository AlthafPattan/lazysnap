export { LazyImage } from "./LazyImage.js";
export type { LazyImageProps } from "./LazyImage.js";

export { useLazyImage } from "./useLazyImage.js";
export type { UseLazyImageOptions, UseLazyImageResult } from "./useLazyImage.js";

// Re-export core configure() so consumers only need one import
export { configure } from "@lazysnap/core";
export type { LazysnapOptions, LazysnapState, LazysnapDefaults } from "@lazysnap/core";
