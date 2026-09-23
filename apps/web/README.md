# LiveOG visual editor

Create animated cards without writing code: choose a template, edit its content,
preview an animation and download the result.

## Using the editor

- **Template:** Launch, Typewriter, Stats, Growth chart and Release each start with sample content. Returning to a template restores your edits.
- **Content:** edit copy and colors or upload a logo and an image/video background. Charts accept 2–100 numbers separated by commas, spaces or new lines. Invalid values are highlighted and block downloads until corrected.
- **Animation:** Signature motion uses the template's typing, counting or drawing animation. Fade in and Slide up animate the finished card. Still freezes the card, including its video background. Choose 3, 4 or 6 seconds, then use Play, Replay or the timeline to inspect it.
- **Download:** Image produces a final-frame PNG, Animation a looping GIF, and Video an MP4 where H.264 encoding is available or a WebM otherwise. Keep a PNG for website link previews; animated sharing support varies by platform.

The editor automatically saves one workspace, with separate content per template,
in IndexedDB. Uploaded videos are stored as blobs, so they survive reloading.
Wait for **All changes saved on this device** before closing the tab. These drafts
are local to this browser and origin; private browsing, storage quotas and clearing
site data can affect persistence. When storage fails, the editor shows a message
and remains usable for editing and downloads.

The optional URL importer appears only when `VITE_META_API` is configured.
Uploaded media is never sent to that service.

## Run locally

From the repository root:

```bash
pnpm install
pnpm dev:web
```

Open `http://localhost:5174/liveog/`. The production site is deployed by the Pages
workflow when changes under `apps/web` reach `main`.

## Verify changes

```bash
pnpm typecheck
pnpm test
pnpm --filter @liveog/web build
pnpm --filter @liveog/renderer exec playwright install chromium
pnpm test:web
```

The browser check starts a temporary Vite preview on port 5187. Set
`LIVEOG_WEB_TEST_PORT` to use another port or `LIVEOG_BROWSER_PATH` to use an
existing Chromium. It exercises template selection, edits, animation timing,
input validation, draft/media restoration, mobile layout, PNG/GIF/video downloads
and unavailable storage. Screenshots and downloads go to
`/tmp/liveog-web-smoke` (override with `LIVEOG_WEB_ARTIFACTS`). GitHub CI runs this
as **Visual editor and downloads** and retains those artifacts.
