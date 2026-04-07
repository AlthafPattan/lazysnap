import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  outdir: "dist",
  target: ["es2020"],
  sourcemap: true,
  external: ["react", "react-dom", "@lazysnap/core"],
  jsx: "automatic",
});

console.log("✅ @lazysnap/react built successfully");
