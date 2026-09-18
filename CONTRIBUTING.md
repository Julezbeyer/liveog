# Contributing to LiveOG

Thanks for helping. LiveOG is pre-alpha, so there is a lot of room to shape it. This guide gets you from clone to a green pull request.

## Principles

1. Never claim a social platform supports motion unless someone verified it.
2. Always provide a static fallback path.
3. Keep the authoring API small and deterministic. A frame is a pure function of the timeline position.
4. Prefer portable primitives over platform-specific hacks.

## Development setup

You need Node 20 or newer, [pnpm](https://pnpm.io) (enabled through `corepack enable`) and [FFmpeg](https://ffmpeg.org/download.html) on your PATH.

```bash
git clone https://github.com/Julezbeyer/liveog.git
cd liveog
pnpm install
pnpm --filter @liveog/renderer exec playwright install chromium
```

Everyday commands:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the demo card at http://localhost:5173 |
| `pnpm dev:web` | Starts the browser playground at http://localhost:5174/liveog/ |
| `pnpm render http://localhost:5173 ./dist` | Renders the running demo to PNG, MP4 and GIF |
| `pnpm test` | Runs the unit tests with Vitest |
| `pnpm typecheck` | Type checks all packages and examples |
| `pnpm build` | Builds every package into its `dist/` folder |

Packages import each other from source through the workspace, so you do not need to rebuild after every change. `pnpm build` is what CI and publishing use.

Already have Chromium installed? Set `LIVEOG_BROWSER_PATH=/path/to/chrome` to skip the Playwright download.

## Repository layout

```text
packages/core       timeline helpers, no framework dependency
packages/react      LiveCard, Animate, Counter, LiveOGTimeProvider
packages/renderer   Playwright capture + FFmpeg encoding
packages/cli        the `liveog` command
examples/basic      Vite demo used by CI and the README
apps/web            browser playground, deployed to GitHub Pages
docs/               README assets
```

## Making a change

1. Pick an issue, or open one for anything larger than a bug fix so we can agree on the approach first. Issues labelled `good first issue` are meant to take an evening.
2. Create a branch from `main`.
3. Add or update tests next to the code (`*.test.ts`). Pure helpers belong in `core` or `renderer` where they are cheap to test.
4. Run `pnpm build && pnpm typecheck && pnpm test`.
5. If you changed a published package, add a changeset: `pnpm changeset`. Pick the packages, choose `patch` or `minor`, write one line. Docs-only changes do not need one. Maintainers: see [RELEASING.md](RELEASING.md) for how those changesets become an npm release.
6. Open the pull request. The template asks for what, why and how you verified it.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat(react): add easing prop to Animate`, `fix(renderer): use last frame as poster`.

## Platform research

Reports about which platforms actually play GIF or MP4 previews are first-class contributions. Use the "Platform compatibility report" issue template and include how you tested, on which client and when. These reports feed the compatibility matrix on the roadmap.

## Releases

Maintainers merge the "version packages" pull request that Changesets opens. That publishes every bumped package to npm and writes the changelogs.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind.
