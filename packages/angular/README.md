# @lazysnap/angular

> Angular directive for @lazysnap/core — production-ready image loading with observability, retry-on-failure, and blur-up transitions. Angular Universal (SSR) safe.

---

## Installation

```bash
npm install @lazysnap/angular
```

Angular 15+ required as a peer dependency.

---

## Global setup — wire observability once

Call this once in your app root — in `main.ts`, `APP_INITIALIZER`, or your root module constructor. Every `lazysnap` directive in your app reports automatically.

```ts
// main.ts
import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/angular";

configure({
  retries:            2,
  retryDelay:         1000,
  transitionDuration: 400,
  ...createAnalyticsPlugin({
    handler:     createSegmentHandler(analytics),
    sampleRate:  0.1,
    events:      ["image_loaded", "image_error"],
    batch:       { maxSize: 20, maxWaitMs: 2000 },
    enrichEvent: (e) => ({ ...e, page: window.location.pathname }),
  }),
});
```

For Angular Universal apps, guard the `configure()` call with `isPlatformBrowser`:

```ts
// app.module.ts or main.ts
import { isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID, inject } from "@angular/core";

if (isPlatformBrowser(inject(PLATFORM_ID))) {
  configure({ ...createAnalyticsPlugin({ handler: createSegmentHandler(analytics) }) });
}
```

During development, use `consoleHandler`:

```ts
import { consoleHandler } from "@lazysnap/angular";

if (!environment.production) {
  configure({ ...createAnalyticsPlugin({ handler: consoleHandler }) });
}
```

---

## Setup

### Standalone components (Angular 14+)

```ts
import { Component } from "@angular/core";
import { LazysnapDirective } from "@lazysnap/angular";

@Component({
  standalone: true,
  imports: [LazysnapDirective],
  template: `
    <img
      lazysnap
      [lazysnapSrc]="product.imageUrl"
      [lazysnapPlaceholder]="product.lqipUrl"
      [lazysnapRetries]="3"
      (lazysnapLoaded)="onLoaded($event)"
      (lazysnapError)="onError($event)"
      [alt]="product.name"
      width="800"
      height="600"
    />
  `,
})
export class ProductCardComponent {
  @Input() product!: Product;

  onLoaded(entry: LazysnapEntry): void {
    // entry.timing.timeToLoad, entry.connection, entry.dimensions all available
  }

  onError({ entry, error }: { entry: LazysnapEntry; error: Error }): void {
    this.errorMonitor.capture("product_image_failed", {
      src:        entry.options.src,
      attempts:   entry.attempts,
      connection: entry.connection.effectiveType,
    });
  }
}
```

### NgModule apps

```ts
import { NgModule } from "@angular/core";
import { LazysnapModule } from "@lazysnap/angular";

@NgModule({
  imports: [LazysnapModule],
})
export class AppModule {}
```

---

## Real-world example — product grid

```ts
@Component({
  standalone: true,
  imports: [LazysnapDirective, NgFor],
  template: `
    <div class="product-grid">
      <div class="card" *ngFor="let product of products; let i = index">
        <img
          lazysnap
          [lazysnapSrc]="product.imageUrl"
          [lazysnapPlaceholder]="product.lqipUrl"
          [lazysnapSrcset]="getSrcset(product)"
          [lazysnapSizes]="'(max-width: 600px) 100vw, 300px'"
          [lazysnapRetries]="3"
          [lazysnapRetryDelay]="1500"
          (lazysnapVisible)="trackVisible(product, i)"
          (lazysnapLoaded)="trackLoaded(product, $event)"
          (lazysnapError)="handleError(product, $event)"
          [alt]="product.name"
          width="600"
          height="450"
          class="card__image"
        />
        <div class="card__body">
          <h3>{{ product.name }}</h3>
        </div>
      </div>
    </div>
  `,
})
export class ProductGridComponent {
  @Input() products: Product[] = [];

  getSrcset(product: Product): string {
    return `${product.imageUrl}?w=480 480w, ${product.imageUrl}?w=1200 1200w`;
  }

  trackVisible(product: Product, position: number): void {
    this.analytics.track("product_image_visible", {
      productId: product.id,
      position,             // which image in the grid the user scrolled to
    });
  }

  trackLoaded(product: Product, entry: LazysnapEntry): void {
    this.analytics.track("product_image_loaded", {
      productId:  product.id,
      timeToLoad: entry.timing.timeToLoad,   // ms from viewport → loaded
      connection: entry.connection.effectiveType,
      retried:    entry.attempts > 1,
    });
  }

  handleError({ entry, error }: { entry: LazysnapEntry; error: Error }): void {
    // entry.attempts tells you how many retries were attempted before giving up
    this.errorMonitor.capture(error, {
      src:        entry.options.src,
      attempts:   entry.attempts,
      connection: entry.connection.effectiveType,
    });
    // Show a fallback image in your template via the data-lazysnap-state attribute
    // img[data-lazysnap-state="error"] { background: #f5f5f5; }
  }
}
```

---

## Above-the-fold images (LCP)

For hero images that should load immediately without waiting for viewport intersection:

```html
<img
  lazysnap
  [lazysnapSrc]="heroUrl"
  [lazysnapPlaceholder]="heroLqipUrl"
  [lazysnapEager]="true"
  alt="Hero"
  width="1920"
  height="1080"
/>
```

---

## Directive inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `lazysnapSrc` | `string` | — | **Required.** Full-res image URL |
| `lazysnapPlaceholder` | `string` | — | LQIP src or base64 data URI |
| `lazysnapSrcset` | `string` | — | Responsive srcset string |
| `lazysnapSizes` | `string` | — | Responsive sizes string |
| `lazysnapPlaceholderColor` | `string` | `"transparent"` | Background color while loading |
| `lazysnapTransitionDuration` | `number` | `400` | Blur-up duration in ms |
| `lazysnapRootMargin` | `string` | `"0px 0px 200px 0px"` | IO rootMargin |
| `lazysnapThreshold` | `number \| number[]` | `0` | IO threshold |
| `lazysnapRetries` | `number` | `2` | Retry attempts on failure |
| `lazysnapRetryDelay` | `number` | `1000` | Delay between retries in ms |
| `lazysnapEager` | `boolean` | `false` | Load immediately (LCP images) |

## Directive outputs

| Output | Payload | Description |
|---|---|---|
| `lazysnapLoaded` | `LazysnapEntry` | Image fully loaded — includes timing, connection, dimensions |
| `lazysnapError` | `{ entry, error }` | All retries failed — includes attempt count and network info |
| `lazysnapVisible` | `LazysnapEntry` | Element entered viewport — includes scroll depth timing |

## State attribute

The directive reflects state on the host element for CSS targeting:

```css
img[data-lazysnap-state="loading"] { opacity: 0.6; }
img[data-lazysnap-state="loaded"]  { opacity: 1; transition: opacity 0.4s; }
img[data-lazysnap-state="error"]   { background: #f5f5f5; }
```

---

## Angular Universal (SSR)

The directive uses Angular's `PLATFORM_ID` token internally. On the server, it no-ops completely — no `window`, `document`, or `IntersectionObserver` access. Images render as empty `<img>` tags on the server and hydrate on the client without flicker.

---

## License

MIT © Althaf Khan Pattan
