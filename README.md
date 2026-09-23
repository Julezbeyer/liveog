# LiveOG

**Bring Open Graph to life.**

LiveOG renders animated social preview cards from React components. You write one card, LiveOG captures it frame by frame in a headless browser and exports a static PNG fallback plus MP4, GIF and animated WebP versions.

[![CI](https://github.com/Julezbeyer/liveog/actions/workflows/ci.yml/badge.svg)](https://github.com/Julezbeyer/liveog/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@liveog/cli?label=%40liveog%2Fcli)](https://www.npmjs.com/package/@liveog/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p align="center">
  <img src="docs/demo.gif" width="600" alt="Animated LiveOG card: the headline slides in and a star counter counts up to 12,842" />
</p>

<p align="center"><sub>Rendered by <code>liveog render</code> from <a href="examples/basic/src/main.tsx">examples/basic</a>. The static fallback is <a href="docs/demo.png">docs/demo.png</a>.</sub></p>

## Create a card without code

**[Open the LiveOG editor](https://julezbeyer.github.io/liveog/)** — create a card in four steps:

1. **Template:** choose Launch, Typewriter, Stats, Growth chart or Release.
2. **Content:** edit text, paste chart values, choose a color and upload your logo or background.
3. **Animation:** use the template's signature motion, fade in, slide up or keep it still. Preview and replay a 3, 4 or 6 second card.
4. **Download:** save a PNG image, animated GIF or video (MP4 where supported, otherwise WebM).

Drafts, including uploaded images and videos, save automatically on this device. Switching templates keeps each template's edits. Wait for “All changes saved” before closing the tab. Drafts belong to the current browser; clearing its site data removes them.

Rendering happens in your browser. An optional website import sends the URL to the configured metadata service; uploaded media stays local. The editor lives in [`apps/web`](apps/web) and uses `@liveog/react`. See the [editor guide](apps/web/README.md) for local development and browser checks.

## Why

Open Graph previews are still static images. Some platforms play MP4 or GIF previews, most do not, and every one of them needs a static fallback. LiveOG gives you a deterministic timeline so a single card definition produces all four outputs, and it never pretends a platform supports motion when it does not.

See the [platform compatibility table](docs/compatibility.md) for the current
verification status.

> **Unreleased features:** The preview CLI, `CodeTyping` / `Typewriter`, `Sparkline` and WebP export described here are available in this source branch. Use the workspace commands below until the next npm release.

## Quick start

Prerequisites: Node 20+, [FFmpeg](https://ffmpeg.org/download.html) on your PATH.

```bash
npm install @liveog/react
npx @liveog/cli render http://localhost:5173 ./dist
```

For example, `liveog render http://localhost:5173 ./dist --formats png,mp4,gif` shows a progress bar and prints meta tags when finished (timings and sizes vary):

```text
✔ Browser ready
✔ Frames captured
✔ Encoded

  Rendered 120 frames in 9.7s → dist/
    og.png               72.3 KB
    og.mp4               65.9 KB
    og.gif              258.7 KB

  Paste into your <head>:

    <meta property="og:image" content="og.png" />
    ...
```

Add `--verbose` to see FFmpeg's own output, or `--no-progress` for plain log lines. Progress is disabled automatically when the output is not a terminal, so CI logs stay readable.

Default output with the current source version:

```text
dist/
├── og.png                 # static fallback, last frame of the animation
├── og.mp4                 # H.264, faststart, ready for og:video
├── og.gif                 # palette-encoded, roughly 300 KB for a 4s card
├── og.webp                # animated WebP
└── liveog.manifest.json   # sizes, asset list and ready-to-paste meta tags
```

Options:

```text
liveog render [url] [outDir] [options]

  --width <px>        Card width (default 1200)
  --height <px>       Card height (default 630)
  --duration <ms>     Animation length (default 4000)
  --fps <n>           Frames per second (default 30)
  --formats <list>    Comma separated subset of png,mp4,gif,webp (default all)
  --poster <ms>       Timeline position for the PNG (default: end)
  --browser <path>    Chromium binary instead of the Playwright download
  --base-url <url>    Public URL prefix used in the manifest and meta tags
  --no-manifest       Skip writing liveog.manifest.json
  --config <path>     Config file to load (default: liveog.config.ts in cwd)
  --no-config         Ignore any config file
```

The first run of the renderer downloads Chromium through Playwright. Point `--browser` or `LIVEOG_BROWSER_PATH` at an existing Chromium to skip that. FFmpeg is checked before any frames are captured, so a missing install fails in a second rather than after a full render.

## Preview a card locally

Start your card app first. The preview command embeds its URL and adds a timeline scrubber, play/pause, frame stepping and playback speed controls.

After installing dependencies, start the demo in one terminal and the preview in a second:

```bash
pnpm install
pnpm dev
```

```bash
pnpm --filter @liveog/cli start preview http://localhost:5173 --open
```

The preview server defaults to `http://localhost:3000`; use the URL printed in the terminal. `liveog dev` is an alias for `liveog preview`. The command controls an existing card app; it does not start that app's development server.

```text
liveog preview [url] [options]

  -p, --port <port>   Preview server port (default 3000; 0 picks a free port)
  --host <host>       Preview server host (default localhost)
  -o, --open          Open the preview in your browser
  --width <px>       Card width (default 1200)
  --height <px>      Card height (default 630)
  --duration <ms>    Timeline length (default 4000)
  --fps <n>          Frame stepping rate (default 30)
```

The preview also reads the config file. Keep its dimensions, duration and fps aligned with your card and render settings. Use the current `@liveog/react` components so the embedded card receives timeline updates across ports.

## Config file

Drop a `liveog.config.ts` (or `.mjs`) next to your project and run `liveog render` with no arguments. Command line flags override the file:

```ts
import type { LiveOGFileConfig } from '@liveog/cli/config'

export default {
  url: 'http://localhost:5173',
  outDir: './dist',
  duration: 3000,
  formats: ['png', 'mp4', 'gif', 'webp'],
  port: 3000, // local preview server
  baseUrl: 'https://example.com/og',
} satisfies LiveOGFileConfig
```

TypeScript configs need Node 22.6+ or a loader like tsx; a `liveog.config.mjs` works on any supported Node.

### Animated WebP

All four formats are rendered by default. Keep a PNG fallback when selecting a subset:

```bash
pnpm render http://localhost:5173 ../../dist --formats png,webp
```

Workspace `pnpm render` runs inside `packages/cli`, so `../../dist` writes to the repository root. An installed `liveog render` resolves the output directory from your current directory.

WebP encoding requires FFmpeg with `libwebp`. For quality, lossless encoding and loop control, use the renderer library:

```ts
import { render } from '@liveog/renderer'

await render({
  url: 'http://localhost:5173',
  outDir: './dist',
  formats: ['png', 'webp'],
  webp: { quality: 85, lossless: false, loop: 0 },
})
```

The defaults are quality `75`, lossy encoding and infinite looping (`loop: 0`). These encoding options are library options; the CLI and config file select the format through `formats`.

## Manifest and meta tags

Every render writes `liveog.manifest.json` describing what was produced:

```json
{
  "version": 1,
  "width": 1200,
  "height": 630,
  "duration": 4000,
  "fps": 30,
  "posterTime": 3967,
  "assets": [
    { "format": "png", "file": "og.png", "url": "https://example.com/og/og.png", "type": "image/png", "bytes": 74036 }
  ],
  "meta": ["<meta property=\"og:image\" content=\"https://example.com/og/og.png\" />"]
}
```

The `meta` array is printed after each render and can be pasted into your `<head>`. When PNG is included, `og:image` points at that static fallback. MP4 adds `og:video` tags. GIF and WebP are listed in the manifest but are not advertised as `og:image`; exporting an animation does not establish support in a platform's link previews. Keep `png` in your selected formats for social sharing.

## Writing a card

```tsx
import { LiveCard, Animate, Counter } from '@liveog/react'

export function Card() {
  return (
    <LiveCard width={1200} height={630} duration={4000}>
      <Animate from="bottom" duration={700}>
        <h1>LiveOG</h1>
      </Animate>
      <Counter from={0} to={12842} suffix=" stars" delay={700} easing="easeOutExpo" />
    </LiveCard>
  )
}
```

The renderer drives the animation by dispatching a `liveog:time` event with the current timeline position in milliseconds. Components pick that up on their own, so a card is just a function of time — which makes renders deterministic and reproducible in CI.

Driving the timeline yourself (for a scrubber or a custom preview) is opt-in:

```tsx
import { LiveOGTimeProvider, useLiveOGTime } from '@liveog/react'

<LiveOGTimeProvider value={time}>
  <Card />
</LiveOGTimeProvider>
```

Inside a provider `useLiveOGTime()` returns that value; outside one it subscribes to `liveog:time` itself.

### Timing and easing

`Animate` and `Counter` share the same timing props, so elements can be staggered on one timeline:

| Prop | Default | What it does |
| --- | --- | --- |
| `duration` | `700` / `1800` | Length of the segment in ms |
| `delay` | `0` | Milliseconds to wait before the segment starts |
| `easing` | `'easeOutCubic'` | Built-in curve name or a custom `(t: number) => number` |

`Animate` additionally takes `from` (`bottom`, `top`, `left`, `right`) and `distance` in pixels. `Counter` takes `format` to control how the value is rendered:

```tsx
<Counter to={12842} format={v => `${(v / 1000).toFixed(1)}k`} />
```

Built-in easings: `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, `easeOutExpo`. Every curve is anchored so `f(0) === 0` and `f(1) === 1`, which keeps the poster frame showing the finished card.

### Typing text and animated charts

`CodeTyping` progressively reveals code with syntax highlighting and a cursor. `Typewriter` is an alias that also accepts a `text` prop. `Sparkline` draws an SVG line or filled area along the same timeline:

```tsx
import { LiveCard, CodeTyping, Typewriter, Sparkline } from '@liveog/react'

export function MetricsCard() {
  return (
    <LiveCard width={1200} height={630} duration={4000}>
      <Typewriter text="A week of progress" duration={1000} />
      <CodeTyping
        code={'const stars = 12842;'}
        language="typescript"
        delay={1000}
        duration={1500}
      />
      <Sparkline
        data={[12, 18, 15, 28, 36, 42, 58]}
        width={600}
        height={180}
        stroke="#3b82f6"
        smooth
        fill
        delay={1000}
        duration={2000}
      />
    </LiveCard>
  )
}
```

Both primitives accept `delay`, `duration` and `easing`. Typing defaults to `2000` ms, Sparkline to `1000` ms, and both use `linear` easing with no delay. They derive their state from the timeline, so scrubbing backward also reverses their progress.

For typing, use `showCursor={false}` to hide the cursor. For charts, `fill` enables an area gradient, `smooth` curves the line, `showTip={false}` hides the leading dot, and `min` / `max` fix the vertical scale. See the exported [typing props](packages/react/src/CodeTyping.tsx) and [chart props](packages/react/src/Sparkline.tsx) for all options.

## Examples

[`examples/basic`](examples/basic) is the minimal card used by CI. [`examples/github-stats`](examples/github-stats) fetches a repository from the GitHub API and animates its stars, forks and open issues:

```bash
pnpm dev:github-stats
pnpm render "http://localhost:5174/?repo=Julezbeyer/liveog" ../../dist
```

Change `?repo=owner/name` to point it at any public repository. It uses the unauthenticated API (60 requests per hour) and renders nothing until the fetch settles, so the renderer's `networkidle` wait never captures a loading state.

The [Next.js App Router example](examples/nextjs) shows a card route, a render step and manifest-based metadata. The [social preview example](examples/social-preview) renders this repository’s own card.

## Packages

| Package | What it does |
| --- | --- |
| [`@liveog/react`](packages/react) | `LiveCard`, `Animate`, `Counter`, `CodeTyping` / `Typewriter`, `Sparkline` and the time provider |
| [`@liveog/core`](packages/core) | Framework-free timeline helpers and defaults |
| [`@liveog/renderer`](packages/renderer) | Playwright capture and FFmpeg encoding as a library |
| [`@liveog/cli`](packages/cli) | `liveog render`, `liveog preview` and `liveog dev` |
| [`apps/web`](apps/web) | The browser playground, deployed to GitHub Pages |

## Status

Published on npm as of v0.2.0. Still pre-1.0: the API surface is intentionally small and will change. See the [roadmap](ROADMAP.md) for what is planned and the [open issues](https://github.com/Julezbeyer/liveog/issues) for where help is wanted.

## Contributing

Issues labelled [`good first issue`](https://github.com/Julezbeyer/liveog/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are scoped to be done in an evening. Platform compatibility reports are just as valuable as code: LiveOG only claims motion support that someone has verified.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.

## License

[MIT](LICENSE)
