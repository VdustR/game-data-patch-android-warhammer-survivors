# Release notes

For documentation or tooling changes that do not need a new release, run `pnpm changeset add --empty`. Commit that record so the PR check can distinguish an intentional no-release change from a missing release note.

Run `pnpm changeset` for user-visible changes. Commit the generated note with the change. After merge, the Release workflow opens a version PR. Review and merge that PR after its dispatched CI passes; the next successful main CI publishes the standalone tools and updates GitHub Pages. This project does not publish to npm.
