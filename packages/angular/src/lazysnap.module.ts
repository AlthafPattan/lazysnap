import { NgModule } from "@angular/core";
import { LazysnapDirective } from "./lazysnap.directive.js";

/**
 * NgModule that exports LazysnapDirective for use in non-standalone Angular apps.
 *
 * @example
 * ```ts
 * // app.module.ts
 * import { LazysnapModule } from "@lazysnap/angular";
 *
 * @NgModule({
 *   imports: [LazysnapModule],
 * })
 * export class AppModule {}
 * ```
 *
 * For standalone components, import LazysnapDirective directly:
 * ```ts
 * @Component({
 *   imports: [LazysnapDirective],
 * })
 * ```
 */
@NgModule({
  imports: [LazysnapDirective],
  exports: [LazysnapDirective],
})
export class LazysnapModule {}
