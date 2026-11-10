# Product

An unofficial local utility for players to edit both Warhammer Survivors Android currency balances while keeping a recoverable original save.

- Users select a save, inspect its version and balances, set one or both balances, and download a modified copy.
- A standalone CLI and an offline single-file website share the same patching core.
- Basic recognition only: JSON object, Android marker, both world balance fields, selected world, root balance, and valid root checksum. Do not rigidly validate every game field.
- Unknown versions show a warning and require explicit opt-in. Missing essential fields or failed checksums block output.
- Verified device build: Android 17, game 2.1.4, versionCode 178089, 2026-11-10. The save itself cannot establish versionCode.
- Device-tested targets: 1 million and 1 billion for both worlds. The main menu displays 9,999,999 for billion balances; game-written saves and subsequent AoS upgrade purchases retained the larger value. Online cloud persistence is unverified.
- Preserve unrelated bytes, game progress, original files, and existing outputs. No uploads, analytics, account access, or automatic phone writes.
- Browser copy is Traditional Chinese; implementation documentation is English. The app icon and generated sharing artwork are attributed separately from MIT code. No proprietary binaries or private saves ship.
