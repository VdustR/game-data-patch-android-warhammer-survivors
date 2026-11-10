# Project instructions

Use English for source, documentation, commits, and PR text. Product UI is Traditional Chinese (Taiwan).

- Shared save behavior belongs in `src/core.ts`; browser and CLI must use it.
- Preserve all unmodified bytes. Do not replace targeted edits with whole-file JSON serialization.
- Keep file recognition minimal: required Android/world/money/checksum fields, unknown fields preserved. A different version warns; a failed checksum blocks output.
- Never overwrite a source or an existing script output. Do not add automatic phone installation or cloud writes without a specific request.
- No user saves, APKs, proprietary libraries, device IDs, or private screenshots in Git.
- Read `PRODUCT.md`, `DESIGN.md`, and the editor surface brief before UI changes. Keep offline HTML parity and mobile error recovery.
- Use the pinned mise/pnpm toolchain. Run `pnpm verify`; add a Changeset for user-visible changes.
- `src/**/*.svelte` uses Prettier's Svelte plugin and svelte-check. Other supported files use Vite+ formatting and linting. Keep independent compiler checks.
- The MIT license applies to original code; game artwork and font attribution are in `docs/assets.md`.
