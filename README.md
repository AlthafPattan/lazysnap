# lazysnap

**Lazy image loading with observability, retry resilience, and cross-framework consistency.**

Built for production React and Angular apps — not just demos.

[![npm version](https://img.shields.io/npm/v/@lazysnap/core?style=flat-square&color=black)](https://www.npmjs.com/package/@lazysnap/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@lazysnap/core?style=flat-square&label=core%20size&color=black)](https://bundlephobia.com/package/@lazysnap/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-black?style=flat-square)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/@lazysnap/core?style=flat-square&color=black)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/AlthafPattan/lazysnap/ci.yml?style=flat-square&label=CI&color=black)](https://github.com/AlthafPattan/lazysnap/actions)

[**Demo**](https://althafpattan.github.io/lazysnap) · [**Core docs**](./packages/core/README.md) · [**React docs**](./packages/react/README.md) · [**Angular docs**](./packages/angular/README.md) · [**Changelog**](./CHANGELOG.md)

</div>

---

## The problem

`loading="lazy"` is a good baseline. It does not tell you anything.

When a product image fails on a 3G connection — CDN timeout, bad deploy, misconfigured origin — the browser makes one attempt and stops. No retry. No callback. Nothing in Sentry or Datadog. You find out when a user complains or a sales report looks wrong.

|  | symptom |
|---|---|
| **Silent failures** | A 404'd product image is invisible to your error monitoring. The user sees a broken icon. You never find out. |
| **No visibility** | Which images fail most? What is your p95 load time on 3G? Do users even scroll to image #5? You cannot answer these. |
| **Inconsistent behavior** | React and Angular apps in the same org each make their own image loading choices. No shared retry logic, no shared telemetry. |

LazySnap closes these gaps with a single install.

---

## Packages

| Package | Description | Size |
|---|---|---|
| [`@lazysnap/core`](./packages/core) | Framework-agnostic engine. Zero dependencies. Works with any JS framework or none. | ~3kb |
| [`@lazysnap/react`](./packages/react) | `<LazyImage />` component + `useLazyImage()` hook. Full TypeScript props. | ~2kb |
| [`@lazysnap/angular`](./packages/angular) | `lazysnap` directive + `LazysnapModule`. Angular 15+, SSR-safe. | ~2kb |

---

## Install

```bash
# core — any framework
npm install @lazysnap/core

# react
npm install @lazysnap/react

# angular
npm install @lazysnap/angular
```

---

## Quick start

### Vanilla JS

```ts
import { observe, configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";

// Wire up observability once at app startup
configure({
  ...createAnalyticsPlugin({ handler: consoleHandler }),
});

const cleanup = observe(document.querySelector<HTMLImageElement>("img#hero")!, {
  src:         "/images/hero.jpg",
  placeholder: "/images/hero-lqip.jpg",
  retries:     2,
  onLoad:  (entry) => console.log(`loaded in ${entry.timing.timeToLoad}ms`),
  onError: (entry, err) => monitor.capture(err, { src: entry.options.src }),
});

cleanup(); // call on unmount / route change
```

### React

```tsx
import { LazyImage } from "@lazysnap/react";

function ProductCard({ product }: { product: Product }) {
  return (
    <LazyImage
      src={product.imageUrl}
      placeholder={product.lqipUrl}
      alt={product.name}
      width={800}
      height={600}
      retries={3}
      decoding="async"
      loadedClassName="card__img--loaded"
      fallback={<ProductSkeleton />}
      onError={(entry, err) => monitor.capture(err, {
        src:      entry.options.src,
        attempts: entry.attempts,
        network:  entry.connection.effectiveType,
      })}
    />
  );
}
```

### Angular

```ts
// app.module.ts
import { LazysnapModule } from "@lazysnap/angular";

@NgModule({ imports: [LazysnapModule] })
export class AppModule {}
```

```html
<img
  lazysnap
  [lazysnapSrc]="product.imageUrl"
  [lazysnapPlaceholder]="product.lqipUrl"
  [lazysnapRetries]="3"
  [lazysnapRetryDelay]="1500"
  (lazysnapLoaded)="onLoaded($event)"
  (lazysnapError)="onError($event)"
  [alt]="product.name"
  width="800"
  height="600"
/>
```

---

## Observability

Wire up once at app startup. Every image in your app reports automatically.

```ts
import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/core";

configure({
  ...createAnalyticsPlugin({
    handler:     createSegmentHandler(analytics),
    sampleRate:  0.1,                              // track 10% — keeps volume manageable
    events:      ["image_loaded", "image_error"],
    batch:       { maxSize: 20, maxWaitMs: 2000 },
    enrichEvent: (e) => ({
      ...e,
      page:       window.location.pathname,
      experiment: getActiveExperiment(),
    }),
  }),
});
```

Every `image_loaded` event gives you:

| field | value | description |
|---|---|---|
| `event` | `"image_loaded"` | lifecycle event name |
| `src` | `"/products/jacket.jpg"` | image URL |
| `attempts` | `1` | >1 means a retry succeeded |
| `timing.timeToLoad` | `380` | **ms from viewport entry → loaded** |
| `timing.timeToVisible` | `2140` | ms from page load → viewport entry |
| `connection.effectiveType` | `"3g"` | Network Information API |
| `connection.downlink` | `1.4` | Mbps |
| `connection.rtt` | `280` | ms |
| `dimensions` | `{ width: 1200, height: 800 }` | natural image size |
| `timestamp` | `"2025-06-14T09:41:22Z"` | ISO 8601 |

`image_error` events include all the same fields plus `errorMessage` and the total attempt count.

### Questions you can now answer

- Which product images have an error rate above 1%?
- What is our p95 load time on 3G connections?
- What percentage of users scroll far enough to see image #5 in a product grid?
- Did our CDN change last week actually improve load times?

### Dev mode

```ts
import { configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";

if (process.env.NODE_ENV !== "production") {
  configure({ ...createAnalyticsPlugin({ handler: consoleHandler }) });
}
```

Prints grouped, collapsible entries in the browser console:

```
▶ [lazysnap] image_loaded   hero.jpg — 312ms on 4g (1200×800)
▶ [lazysnap] image_error    product-02.jpg — Failed after 3 attempts on 3g
▶ [lazysnap] image_visible  product-03.jpg — entered viewport (scroll depth: 1840ms)
```

Every loaded image also emits `performance.mark()` and `performance.measure()` entries automatically. They appear as `lazysnap:load-duration:hero.jpg` spans in the DevTools Performance panel.

### Available handlers

| Handler | Use case |
|---|---|
| `createSegmentHandler(segment)` | Segment analytics.js / analytics-next |
| `createAmplitudeHandler(amplitude)` | Amplitude browser SDK |
| `createBeaconHandler(endpoint)` | Custom HTTP endpoint via `sendBeacon` |
| `consoleHandler` | Development and debugging |
| `noopHandler` | Tests / feature-flagged disabled state |

---

## Retry on failure

The browser makes one attempt per image and stops. LazySnap retries automatically. The LQIP placeholder stays visible throughout — the user never sees a broken state while retries are in progress.

```ts
observe(img, {
  src:        "/products/jacket.jpg",
  retries:    3,    // 3 retries after the first failure
  retryDelay: 1500, // 1.5s between each attempt
  onError: (entry, err) => {
    // fires only after ALL retries are exhausted
    // entry.attempts === 4 (1 original + 3 retries)
    Sentry.captureException(err, {
      extra: {
        src:        entry.options.src,
        attempts:   entry.attempts,
        connection: entry.connection.effectiveType,
      },
    });
  },
});
```

> On slow-2G with 25% packet loss, 2 retries reduce per-image failure rates from ~25% to ~1.6% — roughly 12 broken images per 48-image product grid down to fewer than one.

---

## vs `loading="lazy"`

| feature | `loading="lazy"` | lazysnap |
|---|---|---|
| Defer off-screen images | ✅ | ✅ |
| SSR safe | ✅ | ✅ |
| Zero JS required | ✅ | — |
| LQIP / blur-up placeholder | — | ✅ |
| Retry failed loads | — | ✅ |
| Load timing per image | — | ✅ |
| Viewport reach tracking | — | ✅ |
| Error callbacks | — | ✅ |
| Connection metadata (3G/4G) | — | ✅ |
| Analytics integration | — | ✅ |
| DevTools performance marks | — | ✅ |

---

## Configuration

All options can be set globally via `configure()` and overridden per image.

```ts
configure({
  rootMargin:         "0px 0px 200px 0px", // start loading 200px before viewport
  transitionDuration: 400,                 // blur-up fade in ms (0 = disable)
  placeholderColor:   "#f0f0f0",           // background while loading
  retries:            2,
  retryDelay:         1000,
});
```

### Full option reference

| option | type | default | description |
|---|---|---|---|
| `src` | `string` | **required** | Full-resolution image URL |
| `placeholder` | `string` | `""` | LQIP src or base64 data URI |
| `srcset` | `string` | `""` | Responsive srcset string |
| `sizes` | `string` | `""` | Responsive sizes string |
| `placeholderColor` | `string` | `"transparent"` | Background color while loading |
| `transitionDuration` | `number` | `400` | Blur-up fade duration in ms |
| `rootMargin` | `string` | `"0px 0px 200px 0px"` | IntersectionObserver rootMargin |
| `threshold` | `number \| number[]` | `0` | IntersectionObserver threshold |
| `retries` | `number` | `2` | Retry attempts on load failure |
| `retryDelay` | `number` | `1000` | Delay between retries (ms) |
| `eager` | `boolean` | `false` | Load immediately — for LCP images |
| `onLoad` | `(entry) => void` | — | Fires when fully loaded |
| `onError` | `(entry, error) => void` | — | Fires after all retries fail |
| `onVisible` | `(entry) => void` | — | Fires on viewport intersection |

---

## LCP images (above the fold)

For hero images that should load immediately without waiting for intersection:

```tsx
// React
<LazyImage src="/hero.jpg" eager fetchpriority="high" decoding="async" alt="Hero" />

// Angular
<img lazysnap [lazysnapSrc]="heroUrl" [lazysnapEager]="true" alt="Hero" />

// Vanilla
observe(img, { src: "/hero.jpg", eager: true });
```

---

## SSR

Works with Next.js, Angular Universal, Remix, and any server renderer. The `isBrowser()` guard in core prevents any `window` or `document` access during server rendering. No configuration needed.

---

## Browser support

| feature | support |
|---|---|
| IntersectionObserver | Chrome 51+, Firefox 55+, Safari 12.1+, Edge 15+ |
| Network Information API | Chrome / Edge only — `undefined` elsewhere, no errors |
| Fallback (no IO support) | All browsers — loads eagerly |
| SSR | Full support — no-op on server |

---

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
git clone https://github.com/AlthafPattan/lazysnap.git
cd lazysnap

# Install all workspace packages
pnpm install

# Build core first (react/angular depend on it)
pnpm --filter @lazysnap/core build

# Then build the framework wrappers
pnpm --filter @lazysnap/react build
pnpm --filter @lazysnap/angular build
```

This is a pnpm workspace (`pnpm-workspace.yaml`) covering `packages/*`. The `apps/demo` directory is a standalone HTML file and is not part of the workspace.

### Commands

```bash
pnpm --filter @lazysnap/core build      # rebuild core
pnpm --filter @lazysnap/react build     # rebuild react wrapper
pnpm --filter @lazysnap/angular build   # rebuild angular wrapper
pnpm --filter @lazysnap/core test       # run unit tests
pnpm --filter @lazysnap/core test:coverage  # with coverage report

# Open the demo — no server needed, open directly in a browser
open apps/demo/index.html
```

### Repository structure

```
lazysnap/
├── packages/
│   ├── core/src/
│   │   ├── observe.ts               main entrypoint
│   │   ├── observer.ts              pooled IntersectionObserver
│   │   ├── loader.ts                LQIP, blur-up, retry
│   │   ├── defaults.ts              configure() + resolveOptions()
│   │   └── observability/
│   │       ├── analytics.ts         plugin system + sampling + batching
│   │       ├── timing.ts            performance.now() + marks
│   │       ├── connection.ts        Network Information API
│   │       └── handlers.ts          Segment, Amplitude, Beacon, console
│   ├── react/src/
│   │   ├── LazyImage.tsx            forwardRef component
│   │   └── useLazyImage.ts          hook
│   └── angular/src/
│       ├── lazysnap.directive.ts    img[lazysnap] directive
│       └── lazysnap.module.ts       NgModule
├── apps/demo/                       standalone HTML demo (no server needed)
├── .github/workflows/               CI + publish pipelines
├── setup.sh                         first-time install script
└── tsconfig.base.json
```

---

## Contributing

Contributions are welcome.

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Run `pnpm install` then build core before the wrappers (see Setup above)
3. Make your changes and add tests where relevant
4. Ensure tests pass: `pnpm --filter @lazysnap/core test`
5. Open a PR against `main`

For bugs, open an issue with a minimal reproduction. For features, open an issue first to discuss before building.

---

## Releasing

Releases are automated. To publish a new version:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The [publish workflow](./.github/workflows/publish.yml) builds all three packages and publishes to npm with provenance.

---

## License

MIT — see [LICENSE](./LICENSE)

---

<div align="center">

Made by [Althaf Khan Pattan](https://github.com/AlthafPattan)

If this is useful, consider giving it a star ⭐
