---
'@liveog/renderer': minor
'@liveog/cli': minor
---

Emit a metadata manifest, check for FFmpeg up front and load `liveog.config.ts`.

The renderer now writes `liveog.manifest.json` next to the assets: dimensions, timing, a per-asset list with byte sizes and MIME types, and a `meta` array of ready-to-paste Open Graph and Twitter tags. `og:image` always points at the PNG fallback and the GIF is deliberately never advertised as `og:image`. Pass `baseUrl` (CLI: `--base-url`) to get absolute URLs, or `--no-manifest` to skip the file. New exports: `hasFFmpeg()`, `assetUrl()`, `metaTags()` and the `RenderManifest`/`ManifestAsset` types; `RenderResult` gains a `manifest` field.

FFmpeg is now checked before the browser launches, so a missing install fails in a second with install instructions instead of after a full frame capture.

The CLI reads `liveog.config.ts`, `.mts`, `.js` or `.mjs` from the working directory, validates it and lets command line flags override it. `--config <path>` selects a file and `--no-config` ignores one. The config type is exported as `@liveog/cli/config`.
