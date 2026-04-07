# @lazysnap/core

> Framework-agnostic image loading engine with built-in observability, retry-on-failure, and SSR support. Zero dependencies.

---

## Why @lazysnap/core instead of `loading="lazy"`

`loading="lazy"` is a good baseline. But it is a fire-and-forget HTML attribute — it gives you nothing when an image fails, nothing about timing, nothing about which images users actually see, and no way to retry. @lazysnap/core gives you all of that with one function call.

| Capability | `loading="lazy"` | @lazysnap/core |
|---|---|---|
| Defer off-screen images | ✅ | ✅ |
| LQIP / blur-up placeholder | ❌ | ✅ |
| Retry failed loads | ❌ | ✅ |
| Load timing per image | ❌ | ✅ |
| Viewport reach tracking | ❌ | ✅ |
| Error callbacks | ❌ | ✅ |
| Connection info (3G/4G/etc) | ❌ | ✅ |
| DevTools performance marks | ❌ | ✅ |
| Analytics integration | ❌ | ✅ |
| SSR safe | ✅ | ✅ |
| Zero JS | ✅ | ❌ |

Use `loading="lazy"` as a baseline on all images. Use @lazysnap/core when you need visibility into what's happening, resilience when things go wrong, or a placeholder experience.

---

## Installation

```bash
npm install @lazysnap/core
```

---

## Observability

Wire up analytics once at app startup. Every image in your app reports automatically.

```ts
import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/core";
import { AnalyticsBrowser } from "@segment/analytics-next";

const segment = AnalyticsBrowser.load({ writeKey: "YOUR_WRITE_KEY" });

configure({
  ...createAnalyticsPlugin({
    handler:     createSegmentHandler(segment),
    sampleRate:  0.1,
    events:      ["image_loaded", "image_error"],
    batch:       { maxSize: 20, maxWaitMs: 2000 },
    enrichEvent: (e) => ({ ...e, page: window.location.pathname }),
  }),
});
```

### Event payload — `LazysnapAnalyticsEvent`

```ts
{
  event:     "image_loaded" | "image_visible" | "image_error",
  src:       string,
  attempts:  number,           // total load attempts including retries
  timing: {
    observedAt:    number,     // performance.now() when observe() was called
    visibleAt:     number,     // performance.now() when element entered viewport
    loadedAt:      number,     // performance.now() when full-res image loaded
    timeToLoad:    number,     // ms from visible → loaded  ← headline metric
    timeToVisible: number,     // ms from observe() → viewport
  },
  connection: {
    effectiveType: "4g" | "3g" | "2g" | "slow-2g" | undefined,
    downlink:      number | undefined,   // Mbps
    rtt:           number | undefined,   // ms
    saveData:      boolean | undefined,
  },
  dimensions:   { width: number; height: number } | null,
  timestamp:    string,        // ISO 8601
  errorMessage: string,        // only on image_error events
}
```

### Sampling

On a product grid with 48 images, tracking every load event at full volume is wasteful. Use `sampleRate` to track a representative fraction:

```ts
createAnalyticsPlugin({
  handler:    createSegmentHandler(segment),
  sampleRate: 0.25, // track 25% of images
});
```

The sampling decision is made once per image and carried across all its events — if an image is sampled, its `image_visible`, `image_loaded`, and `image_error` events are all tracked. If it is not sampled, none of them are. Events for the same image are never split across the sample boundary.

### Batching

Avoid firing one analytics call per image on high-volume pages:

```ts
createAnalyticsPlugin({
  handler: createSegmentHandler(segment),
  batch: {
    maxSize:   20,    // flush after 20 events
    maxWaitMs: 2000,  // or after 2 seconds, whichever comes first
  },
});
```

Buffered events are automatically flushed when the page is backgrounded or closed via the `visibilitychange` event.

### Enrichment

Add your own metadata to every event:

```ts
createAnalyticsPlugin({
  handler:     createSegmentHandler(segment),
  enrichEvent: (event) => ({
    ...event,
    page:        window.location.pathname,
    userId:      getCurrentUser()?.id,
    experiment:  getActiveExperiment("image-loading"),
    appVersion:  APP_VERSION,
  }),
});
```

---

## Resilience — retry on failure

On slow or flaky networks, images fail silently. @lazysnap retries automatically:

```ts
observe(img, {
  src:        "/products/jacket-001.jpg",
  retries:    3,
  retryDelay: 1500,
  onError: (entry, error) => {
    // Fires only after ALL retries are exhausted
    // entry.attempts === 4 (1 original + 3 retries)
    // entry.connection.effectiveType === "3g"
    Sentry.captureException(error, {
      extra: {
        src:        entry.options.src,
        attempts:   entry.attempts,
        connection: entry.connection.effectiveType,
      },
    });
  },
});
```

The LQIP placeholder stays visible during all retry attempts, so the user never sees a broken image state unless every retry fails.

---

## Basic usage

```ts
import { observe, configure } from "@lazysnap/core";

// Optional global config
configure({
  rootMargin:         "0px 0px 300px 0px",
  transitionDuration: 500,
  retries:            2,
  retryDelay:         1000,
});

const img = document.querySelector<HTMLImageElement>("img#hero")!;

const cleanup = observe(img, {
  src:         "/images/hero.jpg",
  placeholder: "/images/hero-lqip.jpg",
  srcset:      "/images/hero-480.jpg 480w, /images/hero-1200.jpg 1200w",
  sizes:       "(max-width: 768px) 100vw, 50vw",
  onLoad:  (entry) => console.log("loaded in", entry.timing.timeToLoad, "ms"),
  onError: (entry, err) => console.error("failed", err.message),
});

// On route change / component unmount
cleanup();
```

---

## Built-in analytics handlers

### `consoleHandler`

For development — prints a grouped, collapsible summary to the browser console:

```
[lazysnap] image_loaded   hero.jpg — 312ms on 4g (1200×800)
[lazysnap] image_error    product-02.jpg — Failed after 3 attempts on 3g
[lazysnap] image_visible  product-03.jpg — entered viewport (scroll depth: 1840ms)
```

```ts
import { configure, createAnalyticsPlugin, consoleHandler } from "@lazysnap/core";

if (process.env.NODE_ENV !== "production") {
  configure({ ...createAnalyticsPlugin({ handler: consoleHandler }) });
}
```

### `createBeaconHandler(endpoint)`

Posts events to your own HTTP endpoint using `navigator.sendBeacon` (survives page unload) with a `fetch()` keepalive fallback.

This handler is **self-batching** — do not use it with `createAnalyticsPlugin`'s `batch` option:

```ts
configure({
  ...createAnalyticsPlugin({
    handler: createBeaconHandler("/api/image-analytics"),
    // No batch: {} — beacon manages its own buffer
  }),
});
```

Your endpoint receives:
```json
{ "events": [ ...LazysnapAnalyticsEvent[] ] }
```

### `noopHandler`

For tests or feature-flagged disabled state:

```ts
configure({
  ...createAnalyticsPlugin({
    handler: isTrackingEnabled ? createSegmentHandler(segment) : noopHandler,
  }),
});
```

---

## DevTools performance marks

Every successfully loaded image automatically emits browser performance marks — no configuration needed:

```
lazysnap:visible:hero.jpg       ← when element entered viewport
lazysnap:loaded:hero.jpg        ← when full-res image finished loading
lazysnap:load-duration:hero.jpg ← span measure between the two
```

These appear in the DevTools **Performance** panel timeline and are accessible via `PerformanceObserver`:

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntriesByType("measure")) {
    if (entry.name.startsWith("lazysnap:load-duration:")) {
      console.log(entry.name, entry.duration.toFixed(0) + "ms");
    }
  }
});
observer.observe({ type: "measure", buffered: true });
```

---

## API reference

### `observe(element, options): LazysnapCleanup`

Attaches lazy loading and observability to an `<img>` element. Returns a cleanup function — call it on component unmount or route change.

### `configure(options): void`

Sets global defaults and analytics callbacks. Call once at app startup before any `observe()` calls. Callbacks set here are composed with per-instance callbacks — both fire.

### `createAnalyticsPlugin(options): callbacks`

Returns `{ onVisible, onLoad, onError }` callbacks ready to spread into `configure()` or individual `observe()` calls.

### `buildAnalyticsEvent(eventName, entry): LazysnapAnalyticsEvent`

Low-level utility — builds a normalized event payload from an entry. Useful if you're building a custom handler or middleware.

---

## License

MIT © Althaf Khan Pattan
