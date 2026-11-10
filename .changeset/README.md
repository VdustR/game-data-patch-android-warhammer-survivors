# Release notes

Run `pnpm changeset` for user-visible changes. Commit the generated note with the change. After merge, the Release workflow opens a version PR. Review and merge that PR after its dispatched CI passes; the next successful main CI publishes the standalone tools and updates GitHub Pages. This project does not publish to npm.
