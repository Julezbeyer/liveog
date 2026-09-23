# LiveOG × Next.js (App Router)

An animated Open Graph card authored as a normal Next.js route, rendered to
`og.png` / `og.mp4` / `og.gif` / `og.webp` at build time, and wired into `generateMetadata`.

```
pnpm install
pnpm --filter @liveog/nextjs og:render   # builds, serves, captures, stops
pnpm --filter @liveog/nextjs build       # picks up the fresh manifest
pnpm --filter @liveog/nextjs start
```

Open <http://localhost:3000> and view source: `og:image` and `og:video` point at
the rendered files. The card itself is at <http://localhost:3000/og/card>.

## The shape of the integration

There is no runtime magic here. Three pieces, in order:

1. **A route that renders the card.** `app/(card)/og/card/page.tsx` is a normal
   client component using `LiveCard` / `Animate` / `Counter` from
   `@liveog/react`.
2. **A build step that captures it.** `scripts/render-og.mjs` builds the app,
   starts it, points `liveog render` at `/og/card`, and writes
   `public/og/card/{og.png,og.mp4,og.gif,og.webp,liveog.manifest.json}`.
3. **A metadata helper that consumes the manifest.** `lib/liveog-metadata.ts`
   turns the manifest into a Next `Metadata` object. This is the piece that
   would become `@liveog/next` if it grows.

Nothing runs on request. The renderer needs Chromium and FFmpeg, neither of
which exists inside a serverless function, so a route handler that generates an
MP4 per request is not a thing you can ship on Vercel.

## Why two root layouts

`app/` has no `layout.tsx`. Instead both route groups bring their own:

- `app/(site)/layout.tsx` — the real site, with fonts and page chrome.
- `app/(card)/layout.tsx` — no header, no footer, no padding, `overflow: hidden`.

The renderer screenshots the viewport, so anything the card's layout adds ends
up baked into `og.png`. Keeping the capture target on its own root layout means
site chrome can never leak into a preview by accident. The card layout is also
marked `robots: { index: false }` — it is an asset, not a page.

## Two ways to ship the assets

**Commit them** (what this example does). The rendered files live in `public/`
and in git. Builds stay fast, previews work on every branch, and you re-render
by hand when the card changes. The cost is binaries in your history.

**Render in CI.** Keep `public/og/` out of git and produce the assets during the
build. The cost is Chromium and FFmpeg in your build image, and roughly 30
extra seconds per build.

```yaml
- uses: pnpm/action-setup@v6
- uses: actions/setup-node@v7
  with: { node-version: 22, cache: pnpm }
- run: pnpm install --frozen-lockfile
- run: pnpm --filter @liveog/renderer exec playwright install --with-deps chromium
- run: sudo apt-get update && sudo apt-get install -y ffmpeg
- run: pnpm --filter @liveog/nextjs og:render
- run: pnpm --filter @liveog/nextjs build
  env:
    SITE_URL: https://your-site.example.com
```

On Vercel the same two commands become your build command; the install steps
move into `vercel.json`'s `installCommand` or a `postinstall` script.

## Things that will bite you

**`SITE_URL` is not optional.** Open Graph consumers do not resolve relative
URLs. `liveOGMetadata` throws without a base URL rather than emitting tags that
silently render nowhere. This example falls back to `http://localhost:3000` so a
fresh clone builds; a real site should let the build fail instead.

**Capture the production build, not `next dev`.** The animation only moves once
React has hydrated, and the dev server couples hydration to its HMR connection.
Capture a dev server whose HMR socket cannot connect — which is easy to hit in
CI and in containers — and every frame comes out as the un-hydrated initial
state: the right background with all the content still at `opacity: 0`. It looks
like a rendering bug and is not one.

**`box-sizing: border-box` on the card body.** `height: 100%` plus padding under
the default `content-box` makes the content taller than the card, and `LiveCard`
has `overflow: hidden`, so the bottom row disappears without a single warning.

**The first build has no manifest.** The assets are produced by a *running*
server, so they cannot exist before the first build. `lib/liveog-manifest.ts`
reads the manifest with `fs` and returns `null` when it is missing, which is why
`pnpm build` works on a fresh clone — the page just ships without OG tags until
you render.

**`transpilePackages`.** Only needed inside this monorepo, where
`@liveog/react` resolves to its raw `src/index.tsx`. A published install ships
JavaScript and needs no config.
