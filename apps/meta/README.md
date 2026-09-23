# @liveog/meta — "Start from your site"

A single Vercel function behind the playground's URL import. Given a page
address it returns that page's own Open Graph data — title, description, site
name, theme colour, icon and social image — ready to drop into a card.

```
GET /api/import?url=example.com
```

```jsonc
{
  "url": "https://example.com/",
  "siteName": "Example",
  "title": "Ship faster",
  "description": "A tool for shipping.",
  "accent": "#7c5cff",
  "logo":  { "dataUrl": "data:image/png;base64,…", "name": "apple-touch-icon.png", "bytes": 4821 },
  "image": { "dataUrl": "data:image/png;base64,…", "name": "og.png", "bytes": 91244 },
  "notes": []
}
```

## Why this exists at all

The playground is a static site on GitHub Pages, and a browser is not allowed
to read another site's HTML (CORS). Something server-side has to fetch the
page. That is the entire job of this function; the card is still rendered and
exported in the visitor's browser.

## Why images come back inlined

The playground rasterises the card with `html-to-image`. A cross-origin `<img>`
taints the canvas, and every export after that fails. Returning the icon and
social image as data URLs makes them same-origin by construction. As a side
effect, the visitor's browser never contacts the imported site at all.

## Why the social image is offered, not applied

Most sites' `og:image` is already a finished card with its own headline on it.
Laid behind the playground's title, neither is readable. The playground shows it
as a suggestion with a "Use as background" button instead.

## Deploying

1. Vercel → **Add New Project** → import `Julezbeyer/liveog`.
2. Set **Root Directory** to `apps/meta`. No build command, no framework.
3. Deploy. Check `https://<deployment>/api/import?url=example.com` returns JSON.
4. In GitHub: **Settings → Secrets and variables → Actions → Variables**, add
   `META_API_URL` = `https://<deployment>` (no trailing slash needed).
5. **Actions → Pages → Run workflow** once. The Pages build only runs on
   changes under `apps/web/**`, so setting the variable alone does not rebuild.

Until step 4 is done the import panel is not rendered. That is deliberate — a
button that always fails is worse than no button.

### Optional environment variables

| Variable          | Default                          | Purpose |
| ----------------- | -------------------------------- | ------- |
| `ALLOWED_ORIGINS` | `https://julezbeyer.github.io`   | Comma-separated CORS allowlist. Loopback origins on any port are always allowed. |

CORS is hygiene here, not a security boundary: it stops other websites from
quietly using the endpoint from their visitors' browsers, but anything that
speaks HTTP can still call it directly.

## Safety limits

This function fetches whatever a stranger types into a public text field, which
is the textbook setup for server-side request forgery. So:

- **Only public http(s) addresses.** Every hostname is resolved and rejected if
  any address is loopback, private, link-local (including `169.254.169.254`),
  carrier-grade NAT, multicast or reserved — for IPv4, IPv6 and IPv4-mapped IPv6.
- **Every redirect hop is re-checked.** Redirects are followed by hand, because
  `redirect: 'follow'` would let a public host bounce the request to an internal
  one without the guard ever seeing it.
- **Size caps enforced while reading**, not taken from `Content-Length`: 512 KB
  of HTML, 2 MB per social image, 512 KB per icon. An oversized image is skipped
  with a note rather than returned truncated.
- **8 second timeout per request**, 15 second function limit.
- **Vague errors.** Upstream failure details can contain internal hostnames, so
  callers get "That site could not be read." rather than the raw message.

**Known gap:** DNS rebinding. The name is resolved for the check and resolved
again by `fetch`, and those two answers can differ. Closing that needs pinning
the connection to the checked address, which the platform `fetch` does not
expose. Given the function only ever returns a page's `<head>` and two images,
the exposure is small — but it is a known gap, not an oversight.

## Local development

```
pnpm --filter @liveog/meta dev                                    # :3131
VITE_META_API=http://localhost:3131 pnpm --filter @liveog/web dev
```

Set `PORT` if 3131 is taken. Tests run with the rest of the repo: `pnpm test`.
