import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";

const pkg = z
  .object({ version: z.string().regex(/^\d+\.\d+\.\d+$/) })
  .parse(JSON.parse(await readFile("package.json", "utf8")));
if (pkg.version === "0.0.0") throw new Error("Version the initial release with Changesets first.");
const repository = "VdustR/game-data-patch-android-warhammer-survivors";
const tag = `v${pkg.version}`;
// Query the full release list so authentication/network failures cannot be mistaken for absence.
const releases: unknown = JSON.parse(
  execFileSync("gh", ["api", "--paginate", `repos/${repository}/releases`, "--slurp"], {
    encoding: "utf8",
  }),
);
const tags = z
  .array(z.array(z.object({ tag_name: z.string() })))
  .parse(releases)
  .flat()
  .map((release) => release.tag_name);
if (tags.includes(tag)) {
  console.log(`${tag} already exists; no assets overwritten.`);
} else {
  const files = (await readdir("release")).filter((name) => name !== "SHA256SUMS.txt").sort();
  const sums = await Promise.all(
    files.map(
      async (name) =>
        `${createHash("sha256")
          .update(await readFile(`release/${name}`))
          .digest("hex")}  ${name}`,
    ),
  );
  await writeFile("release/SHA256SUMS.txt", sums.join("\n") + "\n");
  const notes = `Warhammer Survivors Android save patcher ${pkg.version}.\n\nDownload warhammer-save-patcher.html for the offline browser tool, or patch-save.mjs for Node 26+. Retain LICENSE, ASSETS.md, and THIRD-PARTY-NOTICES.txt with redistributed copies. SHA256SUMS.txt verifies the files.\n\nDevice-verified game: Android 2.1.4, versionCode 178089. Cloud persistence is not guaranteed. See the README for backup, installation, and rollback instructions.\n`;
  await writeFile("release-notes.tmp", notes);
  try {
    execFileSync(
      "gh",
      [
        "release",
        "create",
        tag,
        ...files.map((name) => `release/${name}`),
        "release/SHA256SUMS.txt",
        "--repo",
        repository,
        "--target",
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        "--title",
        `Save Patcher ${pkg.version}`,
        "--notes-file",
        "release-notes.tmp",
      ],
      { stdio: "inherit" },
    );
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink("release-notes.tmp");
  }
}
