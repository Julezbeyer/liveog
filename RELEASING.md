# Releasing

LiveOG publishes four packages to npm under the `@liveog` scope: `core`, `react`, `renderer` and `cli`. The playground (`apps/web`) and the example (`examples/basic`) are marked `private` and are never published.

Versions are managed with [Changesets](https://changesets.dev). The four packages are `linked`, so they always share a version number.

## Day to day

Any pull request that changes published behaviour needs a changeset:

```bash
pnpm changeset
```

Pick the packages, pick patch/minor/major, describe the change in terms a user of the library would recognise. Commit the generated file in `.changeset/`.

On merge to `main` the Release workflow opens (or updates) a **"chore(release): version packages"** pull request that applies the pending changesets and rewrites the changelogs. Merging *that* PR is what triggers the actual publish.

## First release (one time)

The `@liveog` scope is an npm **organization**, and it has to exist before anything can be published under it.

Create it in the browser — there is no CLI command for this. `npm org` only manages members of an existing org; `npm org create` does not exist. Go to npmjs.com → profile picture → **Add an Organization**, name it `liveog`, and pick the free **"Unlimited public packages"** plan.

Then publish. This can either run from your machine:

```bash
npm login                 # your own machine
pnpm changeset version    # apply changesets, write changelogs
pnpm build
pnpm changeset publish
```

…or, preferably, from CI — see below, so that no publish ever depends on one laptop.

Use `pnpm changeset publish`, never a bare `npm publish` from a package directory. Three packages depend on each other through `workspace:*`, and only pnpm rewrites those into real version ranges when packing. `npm publish` does **not** fail on them — it silently ships a tarball whose `dependencies` still say `"@liveog/core": "workspace:*"`, which then breaks on every `npm install` your users run. Verified with `npm pack` vs `pnpm pack` on a workspace dependency.

## Automating the publish

After the packages exist on npm, pick one of the two options.

### Trusted publishing (recommended)

No long-lived token in the repository. On npmjs.com, for **each** of the four packages, open Settings → Trusted Publisher and add:

| Field | Value |
| --- | --- |
| Publisher | GitHub Actions |
| Organization or user | `Julezbeyer` |
| Repository | `liveog` |
| Workflow filename | `release.yml` |

The workflow already requests `id-token: write`, which is what the OIDC exchange needs. Requires npm 11.5.1+ and Node 22.14+ on the runner; the workflow pins Node 22.

### npm token

On npmjs.com create a **granular access token** with read/write access to `@liveog/*`, then add it to the repository as the secret `NPM_TOKEN` (Settings → Secrets and variables → Actions).

Note that the workflow passes it as `NODE_AUTH_TOKEN`. That is deliberate: `actions/setup-node` with `registry-url` writes an `.npmrc` pointing at `NODE_AUTH_TOKEN`, so a secret wired to `NPM_TOKEN` is silently ignored and the publish fails with `ENEEDAUTH`.

## Troubleshooting

| Error | Cause |
| --- | --- |
| `ENEEDAUTH` / `E401` | Not logged in locally, or the CI token is exposed under the wrong variable name (see above). |
| `E402 Payment Required` | Scoped packages default to private. Every package here sets `publishConfig.access: "public"`; this shows up when publishing outside of Changesets. |
| `E404 Scope not found` | The `@liveog` scope does not exist on the account yet. |
| `E403 Forbidden` | Name already taken, or the account requires 2FA for publishing. |
| Installs of a published package fail to resolve `@liveog/core` | The tarball was built with `npm publish` instead of `pnpm changeset publish`, so `workspace:*` was never rewritten. Publish a fixed patch version. |

## Checklist before a release

- `pnpm test`, `pnpm typecheck` and `pnpm build` pass
- CI is green on `main`, including the render end-to-end job
- The changelog entries read like release notes, not commit messages
