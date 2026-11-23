# Changesets

Use `pnpm changeset` to record changes to the published `cx-viewer` package. Declare patch releases; private build units remain unversioned. Run `pnpm changeset version` only when preparing the release commit, then commit it before creating the matching tag.

The release workflow still publishes one npm package from `packages/app`. Core/content changes that feed it carry a `cx-viewer` changeset.
