import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export const PAYLOAD_FILES = [
  "ASSETS.md",
  "LICENSE",
  "THIRD-PARTY-NOTICES.txt",
  "patch-save.mjs",
  "warhammer-save-patcher.html",
] as const;
export const CHECKSUM_FILE = "SHA256SUMS.txt";
export const RELEASE_FILES = [...PAYLOAD_FILES, CHECKSUM_FILE];

export async function inspectArtifacts(directory: string) {
  const names = await readdir(directory);
  const unexpected = names.filter((name) => !RELEASE_FILES.includes(name));
  if (unexpected.length)
    throw new Error(`Unexpected release files; nothing uploaded: ${unexpected.join(", ")}`);
  for (const name of names) {
    if (!(await lstat(join(directory, name))).isFile()) {
      throw new Error(`Release assets must be regular files, not links: ${name}`);
    }
  }
  const files = await Promise.all(
    PAYLOAD_FILES.map(async (name) => {
      const bytes = await readFile(join(directory, name));
      if (!bytes.length) throw new Error(`Empty release asset: ${name}`);
      return { name, size: bytes.length, digest: createHash("sha256").update(bytes).digest("hex") };
    }),
  );
  const checksums = files.map(({ name, digest }) => `${digest}  ${name}`).join("\n") + "\n";
  return { files, checksums };
}

export async function verifyArtifactChecksums(directory: string) {
  const artifacts = await inspectArtifacts(directory);
  if ((await readFile(join(directory, CHECKSUM_FILE), "utf8")) !== artifacts.checksums) {
    throw new Error("Release checksums do not match the downloaded files.");
  }
  return artifacts;
}
