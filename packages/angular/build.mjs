import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  outdir: "dist",
  target: ["es2020"],
  sourcemap: true,
  external: ["@angular/core", "@angular/common", "@lazysnap/core"],
});

console.log("✅ @lazysnap/angular built successfully");
