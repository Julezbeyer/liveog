# LiveOG

**Bring Open Graph to life.**

LiveOG is an experimental open-source toolkit for building animated, dynamic social preview cards with React while retaining static Open Graph fallbacks.

## Renderer PoC

The first renderer pipeline is now wired: a local card URL is captured frame-by-frame with Playwright and encoded with FFmpeg.

Prerequisites: Node.js, pnpm and FFmpeg.

```bash
pnpm install
pnpm exec playwright install chromium
pnpm --filter @liveog/cli exec liveog render http://localhost:3000/card ./dist
```

Output:

```text
dist/
├── og.png
├── og.gif
└── og.mp4
```

The page can listen for the `liveog:time` browser event to drive a deterministic animation timeline.

## Planned React DX

```tsx
import { LiveCard, Animate, Counter } from '@liveog/react'

export default function Card() {
  return (
    <LiveCard width={1200} height={630} duration={4000}>
      <Animate from="bottom"><h1>LiveOG</h1></Animate>
      <Counter from={0} to={12842} suffix=" stars" />
    </LiveCard>
  )
}
```

## v0.1 scope

React authoring API, deterministic 1200×630 timeline, PNG fallback, MP4/GIF export, metadata generation and local preview.

## Status

Pre-alpha technical proof of concept. APIs are not stable yet.

## License

MIT
