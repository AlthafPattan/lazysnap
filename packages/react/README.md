# @lazysnap/react

> React component and hook for @lazysnap/core — production-ready image loading with observability, retry-on-failure, and blur-up transitions.

---

## Installation

```bash
npm install @lazysnap/react
```

React 17+ required as a peer dependency.

---

## Global setup — wire observability once

Call this once in your app root (`main.tsx`, `_app.tsx`, or `App.tsx`). Every `<LazyImage>` and `useLazyImage` hook in your app reports automatically — no per-component changes needed.

```ts
// main.tsx
import { configure, createAnalyticsPlugin, createSegmentHandler } from "@lazysnap/react";

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

During development, swap in `consoleHandler` to see timing and errors in the browser console:

```ts
import { consoleHandler } from "@lazysnap/react";

if (process.env.NODE_ENV !== "production") {
  configure({ ...createAnalyticsPlugin({ handler: consoleHandler }) });
}
```

---

## `<LazyImage />` — drop-in component

A direct replacement for `<img>`. Accepts all native img attributes plus lazysnap options.

### Product grid example

```tsx
import { LazyImage } from "@lazysnap/react";

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card">
      <LazyImage
        src={product.imageUrl}
        placeholder={product.lqipUrl}
        srcset={`${product.imageUrl}?w=480 480w, ${product.imageUrl}?w=1200 1200w`}
        sizes="(max-width: 600px) 100vw, 400px"
        alt={product.name}
        width={800}
        height={600}
        retries={3}
        loadedClassName="card__image--loaded"
        fallback={<ProductImageSkeleton />}
        style={{ width: "100%", height: "auto" }}
        onError={(entry) => {
          // entry.attempts, entry.timing, entry.connection all available
          errorMonitor.capture("product_image_failed", {
            src:        entry.options.src,
            attempts:   entry.attempts,
            connection: entry.connection.effectiveType,
          });
        }}
      />
    </div>
  );
}
```

### Above-the-fold images (LCP)

For hero images or anything above the fold, skip lazy loading entirely:

```tsx
<LazyImage
  src="/hero.jpg"
  placeholder="/hero-lqip.jpg"
  eager
  alt="Hero"
  width={1920}
  height={1080}
/>
```

### Props

All `LazysnapOptions` are available as props, plus:

| Prop | Type | Description |
|---|---|---|
| `alt` | `string` | **Required.** Accessible alt text |
| `eager` | `boolean` | Load immediately — use for LCP images above the fold |
| `loadedClassName` | `string` | Class added when fully loaded |
| `errorClassName` | `string` | Class added on persistent error |
| `fallback` | `ReactNode` | Rendered while loading (e.g. skeleton) |

All native `<img>` attributes are forwarded.

---

## `useLazyImage` — hook for custom markup

Use this when you need to control the surrounding markup — skeleton states, overlay content, conditional rendering based on load state.

```tsx
import { useLazyImage } from "@lazysnap/react";

function HeroSection() {
  const { ref, state, isLoaded, isError } = useLazyImage({
    src:         "/hero.jpg",
    placeholder: "/hero-lqip.jpg",
    retries:     3,
    onVisible:   (entry) => analytics.track("hero_visible", {
      timeToVisible: entry.timing.timeToVisible,
    }),
    onLoad: (entry) => analytics.track("hero_loaded", {
      timeToLoad: entry.timing.timeToLoad,
      connection: entry.connection.effectiveType,
    }),
  });

  return (
    <div className="hero">
      <img
        ref={ref}
        alt="Hero"
        className={[
          "hero__image",
          isLoaded && "hero__image--loaded",
          isError  && "hero__image--error",
        ].filter(Boolean).join(" ")}
      />

      {state === "idle" || state === "loading" ? (
        <div className="hero__skeleton" aria-hidden="true" />
      ) : null}

      {isError ? (
        <div className="hero__error">Image unavailable</div>
      ) : null}
    </div>
  );
}
```

### Return value

| Property | Type | Description |
|---|---|---|
| `ref` | `RefObject<HTMLImageElement>` | Attach to your `<img>` element |
| `state` | `LazysnapState` | `"idle" \| "loading" \| "loaded" \| "error"` |
| `isLoaded` | `boolean` | Shorthand for `state === "loaded"` |
| `isError` | `boolean` | Shorthand for `state === "error"` |

---

## What each callback receives

```ts
onLoad: (entry: LazysnapEntry) => {
  entry.timing.timeToLoad        // ms from viewport entry → loaded
  entry.timing.timeToVisible     // ms from observe() → viewport
  entry.connection.effectiveType // "4g" | "3g" | "2g" | "slow-2g"
  entry.connection.saveData      // data saver mode?
  entry.dimensions               // { width: 1200, height: 800 }
  entry.attempts                 // 1 on first success, >1 after retries
}

onError: (entry: LazysnapEntry, error: Error) => {
  // Same fields, plus:
  // entry.attempts === total attempts made (retries + 1)
  // error.message contains the src and attempt count
}

onVisible: (entry: LazysnapEntry) => {
  entry.timing.timeToVisible     // how far into the session before this image was seen
  entry.connection               // network at the moment of viewport intersection
}
```

---

## Next.js

Works without configuration. The SSR guard in core prevents any `window` or `document` access during server rendering.

For LCP images in Next.js, use `eager` and add `priority` if using next/image alongside:

```tsx
<LazyImage src="/hero.jpg" eager alt="Hero" />
```

---

## License

MIT © Althaf Khan Pattan
