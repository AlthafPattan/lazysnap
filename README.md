# @lazysnap

> The image loading library built for production — not just lazy loading.

[![npm version](https://img.shields.io/npm/v/@lazysnap/core.svg)](https://www.npmjs.com/package/@lazysnap/core)
[![license](https://img.shields.io/npm/l/@lazysnap/core.svg)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@lazysnap/core)](https://bundlephobia.com/package/@lazysnap/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## The problem with image loading today

Most apps treat images as a solved problem. They add `loading="lazy"` and move on.

Three things go silently wrong in production:

**1. You have no idea which images fail.** A 404'd product image is completely invisible to Sentry, Datadog, and your error monitoring. The user sees a broken image icon. You never find out.

**2. Broken images on slow connections kill conversions.** On 3G, a product image that times out and stays broken is a lost sale. No native browser API retries failed image loads — ever.

**3. You can't answer basic questions about your images.** What percentage of users scroll far enough to see your fifth product image? Which images have the highest load time on mobile? Which CDN region is underperforming? Without instrumentation, these questions have no answer.

@lazysnap is built around three priorities: **observability**, **resilience on slow networks**, and **consistent behavior across React and Angular**. The blur-up transition is a nice bonus.

---

## Packages

| Package | Description |
|---|---|
| [`@lazysnap/core`](./packages/core) | Vanilla JS engine — zero dependencies |
| [`@lazysnap/react`](./packages/react) | React component + hook |
| [`@lazysnap/angular`](./packages/angular) | Angular directive + NgModule |

---

## Observability — images you can actually monitor

This is @lazysnap's core differentiator. Every image load produces a structured event with timing, connection data, and dimensions. Wire it to your analytics provider once — every image in your app reports automatically.

```ts
import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/core";

// Call once at app startup — that's it
configure({
  ...createAnalyticsPlugin({
    handler:     createSegmentHandler(analytics),
    sampleRate:  0.1,                           // track 10% of loads — controls volume
    events:      ["image_loaded", "image_error"], // skip image_visible if not needed
    batch:       { maxSize: 20, maxWaitMs: 2000 },
    enrichEvent: (e) => ({
      ...e,
      page:        window.location.pathname,
      experiment:  getActiveExperiment(),
    }),
  }),
});
```

Every `image_loaded` event includes:

```ts
{
  event:     "image_loaded",
  src:       "/products/jacket-001.jpg",
  attempts:  1,                          // how many tries it took
  timing: {
    timeToLoad:    380,                  // ms from visible → loaded (key metric)
    timeToVisible: 2140,                 // ms from page load → viewport entry
  },
  connection: {
    effectiveType: "3g",                 // what network the user was on
    saveData:      false,                // data saver mode?
    downlink:      1.4,                  // Mbps
    rtt:           280,                  // ms round-trip time
  },
  dimensions: { width: 1200, height: 800 },
  timestamp: "2025-06-14T09:41:22.301Z",
}
```

Every `image_error` event includes the same payload plus `errorMessage` and the retry count. This tells you not just that an image failed — but on which network, after how many attempts, and exactly which asset.

### Questions you can now answer in your analytics dashboard

- What is our p95 image load time on 3G connections?
- Which product images have an error rate above 1%?
- What percentage of users scroll far enough to see the fifth image in our product grid?
- Is our CDN underperforming in a specific region? (cross-reference `timeToLoad` with user location)
- Do images load faster after our CDN config change? (compare `timeToLoad` before and after deploy)

### Development: consoleHandler

During development, use `consoleHandler` to see every image event in the browser console without sending any data anywhere:

```ts
import { configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";

if (process.env.NODE_ENV !== "production") {
  configure({
    ...createAnalyticsPlugin({ handler: consoleHandler }),
  });
}
```

Console output (grouped, collapsible):
```
[lazysnap] image_loaded   hero.jpg — 312ms on 4g (1200×800)
[lazysnap] image_error    product-02.jpg — Failed after 3 attempts on 3g
[lazysnap] image_visible  product-03.jpg — entered viewport (scroll depth: 1840ms)
```

### DevTools Performance panel

Every loaded image automatically emits `performance.mark()` and `performance.measure()` entries. Open the Performance panel in DevTools and you will see `lazysnap:load-duration:hero.jpg` spans on the timeline — no configuration required.

---

## Resilience on slow connections

On poor networks, image loads fail silently. The browser makes one attempt, gets a network error or timeout, and stops. The user sees a broken image icon. You never know it happened.

@lazysnap retries automatically with configurable backoff:

```ts
observe(img, {
  src: "/products/jacket-001.jpg",
  retries:    3,          // retry up to 3 times after the first failure
  retryDelay: 1500,       // wait 1500ms between attempts
  onError: (entry, err) => {
    // only fires after ALL retries are exhausted
    // entry.attempts === 4 at this point (1 initial + 3 retries)
    errorMonitoring.capture(err, { src: entry.options.src });
  },
});
```

While the full-res image is loading (or retrying), the placeholder keeps the layout stable and gives the user something to look at. There is no blank slot, no broken icon, no layout shift. If all retries fail, you get a callback to handle the error gracefully in your UI.

This is especially important for:
- Mobile users on 3G/4G with intermittent connectivity
- International users where CDN coverage is inconsistent
- E-commerce product grids where a broken image is a direct conversion impact

---

## Consistent behavior across React and Angular

If your organization runs both React and Angular apps, you currently have two separate image loading implementations with different behaviors, different error handling, and no shared telemetry.

@lazysnap gives you one mental model, one analytics integration, and identical behavior across both:

```ts
// Configure once — shared across all packages
configure({
  rootMargin:   "0px 0px 300px 0px",
  retries:      2,
  retryDelay:   1000,
  ...createAnalyticsPlugin({ handler: createSegmentHandler(analytics) }),
});
```

```tsx
// React — same options, same events, same timing data
<LazyImage src="/hero.jpg" placeholder="/hero-lqip.jpg" alt="Hero" />
```

```html
<!-- Angular — same options, same events, same timing data -->
<img lazysnap [lazysnapSrc]="heroUrl" [lazysnapPlaceholder]="lqipUrl" alt="Hero" />
```

The `configure()` call is shared. The analytics events are identical. Your Segment dashboard doesn't know or care whether the event came from a React component or an Angular directive.

---

## Quick start

### Vanilla JS

```bash
npm install @lazysnap/core
```

```ts
import { observe, configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";

configure({
  ...createAnalyticsPlugin({ handler: consoleHandler }),
});

const cleanup = observe(document.querySelector("img"), {
  src:         "/images/hero.jpg",
  placeholder: "/images/hero-lqip.jpg",
  retries:     2,
});
```

### React

```bash
npm install @lazysnap/react
```

```tsx
import { LazyImage } from "@lazysnap/react";

<LazyImage
  src="/images/product.jpg"
  placeholder="/images/product-lqip.jpg"
  alt="Product"
  width={800}
  height={600}
  onError={(entry) => errorMonitoring.capture(entry.options.src)}
/>
```

### Angular

```bash
npm install @lazysnap/angular
```

```html
<img
  lazysnap
  [lazysnapSrc]="product.imageUrl"
  [lazysnapPlaceholder]="product.lqipUrl"
  [lazysnapRetries]="3"
  (lazysnapError)="onImageError($event)"
  [alt]="product.name"
/>
```

---

## Analytics handler reference

| Handler | Use case |
|---|---|
| `createSegmentHandler(segment)` | Segment analytics.js / analytics-next |
| `createAmplitudeHandler(amplitude)` | Amplitude browser SDK |
| `createBeaconHandler(endpoint)` | Custom HTTP endpoint via sendBeacon |
| `consoleHandler` | Development and debugging |
| `noopHandler` | Testing / feature-flagged disabled state |

---

## Full option reference

| Option | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | **Required.** Full-resolution image URL |
| `srcset` | `string` | `""` | Responsive srcset string |
| `sizes` | `string` | `""` | Responsive sizes string |
| `placeholder` | `string` | `""` | LQIP src or base64 data URI |
| `placeholderColor` | `string` | `"transparent"` | Background color fallback |
| `transitionDuration` | `number` | `400` | Blur-up transition in ms (0 to disable) |
| `rootMargin` | `string` | `"0px 0px 200px 0px"` | IntersectionObserver rootMargin |
| `threshold` | `number \| number[]` | `0` | IntersectionObserver threshold |
| `retries` | `number` | `2` | Retry attempts on load failure |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |
| `onLoad` | `(entry) => void` | — | Fires when fully loaded |
| `onError` | `(entry, error) => void` | — | Fires after all retries fail |
| `onVisible` | `(entry) => void` | — | Fires on viewport intersection |

---

## SSR

Works with Next.js, Angular Universal, and any server renderer. The `isBrowser()` guard in core prevents any `window` or `document` access on the server. No configuration required.

## Browser support

IntersectionObserver: Chrome 51+, Firefox 55+, Safari 12.1+, Edge 15+. Falls back to eager loading in older browsers — images still load, just without the intersection delay.


---

## Development

```bash
# Clone and run the one-time setup script
git clone https://github.com/your-org/lazysnap.git
cd lazysnap
./setup.sh
```

The setup script installs and builds all three packages in the correct order — core first, then react and angular. After that, individual rebuilds are just:

```bash
npm run build:core
npm run build:react
npm run build:angular
npm test
open apps/demo/index.html
```

> **Why a setup script?** `@lazysnap/react` and `@lazysnap/angular` depend on `@lazysnap/core`
> via a local `file:../core` reference. Core must be built before the other packages install,
> so the order matters. The script handles this automatically.

### Repository structure

```
lazysnap/
├── packages/
│   ├── core/       @lazysnap/core  — zero-dep engine
│   ├── react/      @lazysnap/react
│   └── angular/    @lazysnap/angular
├── apps/demo/      standalone HTML demo (no server needed)
├── setup.sh        first-time install + build script
├── tsconfig.base.json
└── package.json
```

## License

MIT © Althaf Khan Pattan
