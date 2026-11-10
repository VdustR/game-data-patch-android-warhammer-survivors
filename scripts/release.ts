import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  CHECKSUM_FILE,
  inspectArtifacts,
  RELEASE_FILES,
  verifyArtifactChecksums,
} from "./artifacts.ts";
import { REPOSITORY, verifyCurrentMain } from "./verified-main.ts";

const releaseSchema = z.object({
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  target_commitish: z.string(),
  assets: z.array(
    z.object({ name: z.string(), state: z.string(), size: z.number().nonnegative() }),
  ),
});

function gh(args: string[]) {
  return execFileSync("gh", [...args, "--repo", REPOSITORY], { encoding: "utf8" });
}

function findRelease(tag: string) {
  // Pagination/network errors must never be interpreted as an absent release.
  const json: unknown = JSON.parse(
    execFileSync("gh", ["api", "--paginate", `repos/${REPOSITORY}/releases`, "--slurp"], {
      encoding: "utf8",
    }),
  );
  return z
    .array(z.array(releaseSchema))
    .parse(json)
    .flat()
    .find((release) => release.tag_name === tag);
}

function requireComplete(release: z.infer<typeof releaseSchema>) {
  const names = release.assets.map(({ name }) => name).sort();
  if (
    JSON.stringify(names) !== JSON.stringify([...RELEASE_FILES].sort()) ||
    release.assets.some((asset) => asset.state !== "uploaded" || !asset.size)
  ) {
    throw new Error("Release assets are incomplete or unexpected; publication is blocked.");
  }
  if (release.prerelease) throw new Error("A prerelease cannot stand in for the stable release.");
}

async function verifyRemoteFiles(tag: string, expectedChecksums?: string) {
  const directory = await mkdtemp(join(tmpdir(), "warhammer-release-check-"));
  try {
    gh(["release", "download", tag, "--dir", directory]);
    const downloaded = await verifyArtifactChecksums(directory);
    if (expectedChecksums !== undefined && downloaded.checksums !== expectedChecksums) {
      throw new Error("Uploaded artifacts differ from the local build; draft retained.");
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function requirePublicationSource() {
  if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) {
    throw new Error("Publication requires a clean checkout.");
  }
  const source = verifyCurrentMain();
  if (!source.verified) throw new Error(source.reason);
  return source.candidate;
}

function verifyTagTarget(tag: string, expected: string, required = false) {
  const refs = execFileSync(
    "git",
    ["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    { encoding: "utf8" },
  ).trim();
  const targets = new Map(
    refs
      ? refs.split("\n").map((line) => {
          const [sha, ref] = line.split(/\s+/);
          if (!sha || !ref) throw new Error("Unrecognized remote tag response.");
          return [ref, sha];
        })
      : [],
  );
  const target = targets.get(`refs/tags/${tag}^{}`) ?? targets.get(`refs/tags/${tag}`);
  if (required && !target) throw new Error(`Published ${tag} has no remote tag.`);
  if (target && target !== expected)
    throw new Error(`Existing ${tag} points to a different revision.`);
}

const pkg = z
  .object({ version: z.string().regex(/^\d+\.\d+\.\d+$/) })
  .parse(JSON.parse(await readFile("package.json", "utf8")));
if (pkg.version === "0.0.0") throw new Error("Version the initial release with Changesets first.");
const tag = `v${pkg.version}`;
let release = findRelease(tag);
if (release && !release.draft) {
  requireComplete(release);
  verifyTagTarget(tag, release.target_commitish, true);
  await verifyRemoteFiles(tag);
  console.log(`${tag} is complete and its downloaded checksums pass; no assets overwritten.`);
} else {
  const { checksums } = await inspectArtifacts("release");
  const revision = requirePublicationSource();
  verifyTagTarget(tag, revision);
  if (
    release &&
    (release.target_commitish !== revision ||
      release.prerelease ||
      release.assets.some(({ name }) => !RELEASE_FILES.includes(name)))
  ) {
    throw new Error(
      "Existing draft does not match this revision and artifact set; left untouched.",
    );
  }
  await writeFile(join("release", CHECKSUM_FILE), checksums);
  if (!release) {
    const notes = `Warhammer Survivors Android save patcher ${pkg.version}.\n\nDownload warhammer-save-patcher.html for the offline browser tool, or patch-save.mjs for Node 26+. Retain LICENSE, ASSETS.md, and THIRD-PARTY-NOTICES.txt with redistributed copies. SHA256SUMS.txt verifies the files.\n\nDevice-verified game: Android 2.1.4, versionCode 178089. Cloud persistence is not guaranteed. See the README for backup, installation, and rollback instructions.\n`;
    gh([
      "release",
      "create",
      tag,
      "--draft",
      "--target",
      revision,
      "--title",
      `Save Patcher ${pkg.version}`,
      "--notes",
      notes,
    ]);
  }
  // A failed upload leaves a draft. A retry may replace only this matching draft's known artifacts.
  release = findRelease(tag);
  if (!release?.draft || release.target_commitish !== revision)
    throw new Error("Draft changed before upload; stopped.");
  gh([
    "release",
    "upload",
    tag,
    ...RELEASE_FILES.map((name) => join("release", name)),
    "--clobber",
  ]);
  release = findRelease(tag);
  if (!release?.draft) throw new Error("Draft changed before verification; stopped.");
  requireComplete(release);
  await verifyRemoteFiles(tag, checksums);
  if (requirePublicationSource() !== revision)
    throw new Error("Source changed before publication.");
  gh(["release", "edit", tag, "--draft=false", "--latest"]);
  const published = findRelease(tag);
  if (!published || published.draft) throw new Error("Release publication was not confirmed.");
  requireComplete(published);
  verifyTagTarget(tag, revision, true);
  console.log(`Published and verified ${tag}.`);
}
