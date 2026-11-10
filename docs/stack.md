# Stack decision

Selected and tested on 2026-11-10. The product is a browser-local file tool with one shared patching core and no server-side state.

| Concern                   | Selection                                                  | Reason and alternative                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI                        | Svelte 5.57.3                                              | Local reactive file/form state with less manual DOM synchronization than the original vanilla implementation. React or a full-stack router adds no required capability here.         |
| Toolchain                 | Vite+ 1.5.1                                                | Vite application builds, Oxlint, Oxfmt, and Vitest 5.1.0 through one local CLI. Stable was selected after checking the alpha/staging channels; they added no needed feature.         |
| Type checks               | TypeScript 6.0.3, strictest, ts-reset, svelte-check 4.7.8  | Independent compiler and Svelte checks remain required. The installed Svelte checker supports TS5/6, so TS7 was not selected. Oxlint does not establish Svelte template correctness. |
| Formatting                | Oxfmt; Prettier 3.9.10 + Svelte plugin 4.1.1 for `.svelte` | Keep the framework syntax covered explicitly. Svelte's compiler checks accessibility diagnostics.                                                                                    |
| Runtime / package manager | mise, Node 26.13.0, pnpm 11.25.0                           | Exact project pins, frozen lockfile in CI, no project dependency lifecycle scripts required. Husky is initialized explicitly for development.                                        |
| Validation / edits        | Zod 4.6.7, jsonc-parser 3.3.1                              | Validate minimal runtime boundaries and patch numeric token offsets without changing unrelated bytes. Full JSON serialization changes the checksum input and is unsuitable.          |
| Portable artifacts        | esbuild 0.28.2                                             | Retains the verified Node bundle and creates one `file://`-compatible HTML from the compiled Vite output. Vite builds the app; this narrow packaging step inlines its assets.        |
| Checks                    | Vitest; Playwright 1.65.0                                  | Core/CLI contracts plus actual browser file selection, download, recovery, offline operation, and responsive stress cases.                                                           |
| Delivery                  | GitHub Actions / Pages, Changesets 3.0.3 + action 2.1.2    | Version PRs, changelog, static hosting, and downloadable artifacts. The application is private to npm; no npm publication or token is needed.                                        |
| Git hooks                 | Husky 9.1.7, lint-staged 17.6.0                            | Format only staged files; full verification belongs to CI.                                                                                                                           |

Vite+ aliases its underlying Vite package. The pinned pnpm override keeps plugins and tests on that same core rather than installing a second Vite with incompatible plugin types. The peer rule accepts only this exact core version; real builds, tests, and independent type checks verify the combination.

No remote data means no TanStack Query or API contract layer; no cross-route state means no separate store; no backend means no database. These preferences should be adopted when the corresponding problem exists, not as unused dependencies.

## Primary references

- [Vite+ migration rules and pnpm alias requirements](https://viteplus.dev/guide/migrate-rules)
- [Vite+ tests](https://viteplus.dev/guide/test)
- [Svelte TypeScript support](https://svelte.dev/docs/svelte/typescript)
- [svelte-check package metadata](https://www.npmjs.com/package/svelte-check)
- [Changesets automation](https://changesets.dev/guide/automating)
- [Changesets action 2.1.2](https://github.com/changesets/action/tree/v2.1.2)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Release order

Generated `**/CHANGELOG.md` files are excluded from formatting, linting, and staged tasks, including explicit formatter file arguments. Authored `.changeset/*.md` notes remain checked.

CI validates each pull request and main revision. A successful main CI run starts Pages deployment and release preparation. Changesets opens a draft version PR and dispatches CI for its branch because a PR created with `GITHUB_TOKEN` does not itself trigger another workflow. A maintainer reviews and merges the version PR after checks pass. The next successful main CI publishes versioned standalone files and checksums. Before mutation, the source gate checks that the candidate is still the current remote main and that its exact revision has a successful completed push CI run. Stale automatic runs skip; manual runs fail visibly.

Publication uses an explicit artifact manifest. New releases remain drafts until uploaded files are downloaded and their checksums match the build. An interrupted matching draft can be retried; published releases are verified without overwriting assets. Unexpected release-directory files are rejected and retained for inspection.

The repository must enable GitHub Actions PR creation and use the Pages workflow source. No secret beyond the scoped built-in `GITHUB_TOKEN` is needed. Local browser review uses Portless; CI uses an isolated fixed preview port because Portless is not installed in the runner.
