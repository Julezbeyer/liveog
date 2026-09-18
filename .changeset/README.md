# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Every pull request that changes a published package should include a changeset:

```bash
pnpm changeset
```

Pick the affected packages, choose a bump type and write a one-line summary. The
release workflow turns pending changesets into a version PR and publishes to npm
when that PR is merged.
