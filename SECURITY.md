# Security policy

## Supported versions

LiveOG is pre-alpha. Only the latest published version of each `@liveog/*` package receives fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub's private reporting: [Report a vulnerability](https://github.com/Julezbeyer/liveog/security/advisories/new). You should get a first response within seven days.

Things that are in scope:

- The renderer executes a URL you pass in a headless browser and shells out to FFmpeg. Anything that lets a rendered page or a crafted argument escape that boundary is a security issue.
- Path handling in the CLI and renderer (for example writing outside `outDir`).

Things that are not in scope:

- Vulnerabilities in Chromium, Playwright or FFmpeg themselves. Report those upstream.
- Rendering untrusted third-party pages. LiveOG is designed to render your own card.
