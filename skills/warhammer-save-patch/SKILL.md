---
name: warhammer-save-patch
description: Inspect and patch Warhammer Survivors Android save copies with this repository's Node script or local browser tool. Use for 40K/AoS coin editing, compatibility checks, and backup/restore instructions.
---

# Warhammer Survivors save patching

Use the shared patcher instead of reserializing JSON or editing money without recalculating the checksum. Read the repository [README](../../README.md) for installation and the exact checksum contract.

## Inspect and create a copy

From the repository root, install the pinned toolchain and dependencies, then run `pnpm build`. Downloaded release scripts need only Node 26+ and no dependency installation.

```sh
node release/patch-save.mjs /path/to/SaveDataUnity.sav --inspect
node release/patch-save.mjs /path/to/SaveDataUnity.sav --40k 1000000000 --aos 1000000000 -o /path/to/new-save.sav
node release/patch-save.mjs /path/to/new-save.sav --inspect
```

- Omit a world to preserve its balance. Targets are whole numbers from 0 through 1 billion, exactly representable in single precision.
- The script refuses existing destinations, including links. Choose a new filename; do not delete an original to satisfy this check.
- Version 2.1.4 / APK build 178089 was tested on Android 17. `SaveGameVersion` is readable; APK build is not inferred from the save.
- An unknown version may pass basic structure/checksum checks. Report that distinction before using `--allow-unverified-version`; a successful patch alone does not prove the game accepts it.
- Wrong platform, malformed JSON, missing money fields, duplicate keys, or an invalid checksum block output. Explain the reported error; do not disable validation to force the file through.

## Browser route

Open the published site or `release/warhammer-save-patcher.html`. Select the save, enter one or both amounts (blank preserves), generate, and download. Retain a separate original when the browser asks where to save. No file is uploaded.

## Authorized phone installation

Only operate a phone when the user requested device installation. Stop the game before copying its current main and native backup; verify both local copies, then patch that current main copy. Install the candidate under the exact `SaveDataUnity.sav` name, start the game, and inspect the game's next written save. The UI can display 9,999,999 for a stored billion.

A cloud-conflict row must be identified from observed content and its selection mark. Never assume the upper/lower row is local or trust a timestamp alone. If the test fails, stop the game and restore the saved original main and backup, verify hashes, and restore temporary network settings. Do not clear Google Play data or delete backups as a default repair.

Keep saves, device identifiers, APKs, screenshots containing private progress, and reverse-engineered binaries outside public Git history. Record the tool revision, game version, target amounts, output validation, observed game result, and remaining limits without publishing private saves.
