# LiveOG

**Bring Open Graph to life.**

LiveOG renders animated social preview cards from React components. You write one card, LiveOG captures it frame by frame in a headless browser and exports a static PNG fallback plus MP4 and GIF versions.

[![CI](https://github.com/Julezbeyer/liveog/actions/workflows/ci.yml/badge.svg)](https://github.com/Julezbeyer/liveog/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@liveog/cli?label=%40liveog%2Fcli)](https://www.npmjs.com/package/@liveog/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p align="center">
  <img src="docs/demo.gif" width="600" alt="Animated LiveOG card: the headline slides in and a star counter counts up to 12,842" />
</p>

<p align="center"><sub>Rendered by <code>liveog render</code> from <a href="examples/basic/src/main.tsx">examples/basic</a>. The static fallback is <a href="docs/demo.png">docs/demo.png</a>.</sub></p>

## Try it in your browser

**[julezbeyer.github.io/liveog](https://julezbeyer.github.io/liveog/)** — pick a template, add your text and logo, download PNG, GIF and MP4. Everything renders client-side, nothing is uploaded. The playground lives in [`apps/web`](apps/web) and is built with `@liveog/react` itself.

## Why

Open Graph previews are still static images. Some platforms play MP4 or GIF previews, most do not, and every one of them needs a static fallback. LiveOG gives you a deterministic timeline so a single card definition produces all three outputs, and it never pretends a platform supports motion when it does not.

## Quick start

Prerequisites: Node 20+, [FFmpeg](https://ffmpeg.org/download.html) on your PATH.

```bash
npm install @liveog/react
npx @liveog/cli render http://localhost:5173 ./dist
```

Output:

```text
dist/
├── og.png   # static fallback, last frame of the animation
├── og.mp4   # H.264, faststart, ready for og:video
└── og.gif   # palette-encoded, roughly 300 KB for a 4s card
```

Options:

```text
liveog render <url> [outDir] [options]

  --width <px>        Card width (default 1200)
  --height <px>       Card height (default 630)
  --duration <ms>     Animation length (default 4000)
  --fps <n>           Frames per second (default 30)
  --formats <list>    Comma separated subset of png,mp4,gif
  --poster <ms>       Timeline position for the PNG (default: end)
  --browser <path>    Chromium binary instead of the Playwright download
```

The first run of the renderer downloads Chromium through Playwright. Point `--browser` or `LIVEOG_BROWSER_PATH` at an existing Chromium to skip that.

## Writing a card

```tsx
import { useEffect, useState } from 'react'
import { LiveCard, LiveOGTimeProvider, Animate, Counter } from '@liveog/react'

export function Card() {
  const [time, setTime] = useState(0)
  useEffect(() => {
    const onTime = (e: Event) => setTime((e as CustomEvent<number>).detail)
    window.addEventListener('liveog:time', onTime)
    return () => window.removeEventListener('liveog:time', onTime)
  }, [])

  return (
    <LiveOGTimeProvider value={time}>
      <LiveCard width={1200} height={630} duration={4000}>
        <Animate from="bottom"><h1>LiveOG</h1></Animate>
        <Counter from={0} to={12842} suffix=" stars" />
      </LiveCard>
    </LiveOGTimeProvider>
  )
}
```

The renderer drives the animation by dispatching a `liveog:time` event with the current timeline position in milliseconds. Because every frame is a pure function of that number, renders are deterministic and reproducible in CI.

## Packages

| Package | What it does |
| --- | --- |
| [`@liveog/react`](packages/react) | `LiveCard`, `Animate`, `Counter` and the time provider |
| [`@liveog/core`](packages/core) | Framework-free timeline helpers and defaults |
| [`@liveog/renderer`](packages/renderer) | Playwright capture and FFmpeg encoding as a library |
| [`@liveog/cli`](packages/cli) | The `liveog render` command |
| [`apps/web`](apps/web) | The browser playground, deployed to GitHub Pages |

## Status

Pre-alpha. The API surface is intentionally small and will change before 1.0. See the [roadmap](ROADMAP.md) for what is planned and the [open issues](https://github.com/Julezbeyer/liveog/issues) for where help is wanted.

## Contributing

Issues labelled [`good first issue`](https://github.com/Julezbeyer/liveog/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are scoped to be done in an evening. Platform compatibility reports are just as valuable as code: LiveOG only claims motion support that someone has verified.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.

## License

[MIT](LICENSE)
