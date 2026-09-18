# @liveog/cli

## 0.3.0

### Minor Changes

- b7643f1: Progress output while rendering, and a quiet FFmpeg.
  
  `render()` accepts an `onProgress` callback reporting launch, capture and encode
  stages, and a `verbose` flag. FFmpeg's stderr is captured instead of inherited,
  so a successful render no longer prints 60 lines of encoder statistics — on
  failure the last 15 lines are included in the error.
  
  The CLI draws a spinner and progress bar on a TTY, falls back to plain lines in
  CI or when piped, and ends with a summary of file sizes plus the meta tags.
  `--no-progress` and `--verbose` opt out.
  
  Also fixes `liveog --version`, which crashed with an unhandled
  `ERR_PARSE_ARGS_UNKNOWN_OPTION`, and makes a bare `liveog` print usage instead
  of an error.

### Patch Changes

- Updated dependencies [b7643f1]
  - @liveog/renderer@0.3.0

## 0.2.0

### Minor Changes

- 8cefd57: Emit a metadata manifest, check for FFmpeg up front and load `liveog.config.ts`.
  
  The renderer now writes `liveog.manifest.json` next to the assets: dimensions, timing, a per-asset list with byte sizes and MIME types, and a `meta` array of ready-to-paste Open Graph and Twitter tags. `og:image` always points at the PNG fallback and the GIF is deliberately never advertised as `og:image`. Pass `baseUrl` (CLI: `--base-url`) to get absolute URLs, or `--no-manifest` to skip the file. New exports: `hasFFmpeg()`, `assetUrl()`, `metaTags()` and the `RenderManifest`/`ManifestAsset` types; `RenderResult` gains a `manifest` field.
  
  FFmpeg is now checked before the browser launches, so a missing install fails in a second with install instructions instead of after a full frame capture.
  
  The CLI reads `liveog.config.ts`, `.mts`, `.js` or `.mjs` from the working directory, validates it and lets command line flags override it. `--config <path>` selects a file and `--no-config` ignores one. The config type is exported as `@liveog/cli/config`.

### Patch Changes

- Updated dependencies [8cefd57]
  - @liveog/renderer@0.2.0

## 0.1.0

### Minor Changes

- 317a979: Initial 0.1.0 release: React card primitives, deterministic timeline helpers, Playwright + FFmpeg renderer and the `liveog render` CLI.

### Patch Changes

- Updated dependencies [317a979]
  - @liveog/renderer@0.1.0
