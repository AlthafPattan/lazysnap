import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outdir: "dist",
  target: ["es2020"],
  sourcemap: true,
  minify: false,
  external: [],
});

console.log("✅ @lazysnap/core built successfully");
