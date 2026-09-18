# LiveOG

**Bring Open Graph to life.**

LiveOG is an experimental open-source toolkit for building animated, dynamic social preview cards with React while retaining static Open Graph fallbacks.

## Vision

Write one animated card and render the best available asset for each destination: PNG fallback plus motion assets such as MP4/GIF where appropriate.

## Planned DX

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

```bash
npx liveog render
```

Planned output:

```text
dist/
├── og.png
├── og.gif
├── og.mp4
└── metadata.json
```

## v0.1 scope

- React authoring API
- deterministic 1200×630 timeline
- PNG fallback rendering
- MP4/GIF motion export
- metadata generation
- local preview/playground

No hosted SaaS, accounts, database, AI generator, or drag-and-drop editor in v0.1.

## Repository

- `packages/core` — timeline and card model
- `packages/react` — React authoring primitives
- `packages/renderer` — image/video rendering pipeline
- `packages/cli` — `liveog render` CLI
- `examples/basic` — first animated demo

## Status

Pre-alpha technical proof of concept. APIs are not stable yet.

## License

MIT
