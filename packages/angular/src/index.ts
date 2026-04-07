export { LazysnapDirective } from "./lazysnap.directive.js";
export { LazysnapModule } from "./lazysnap.module.js";

// Re-export configure() and types so consumers need one import
export { configure } from "@lazysnap/core";
export type {
  LazysnapOptions,
  LazysnapEntry,
  LazysnapState,
  LazysnapDefaults,
} from "@lazysnap/core";
