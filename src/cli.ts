import { open, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  decodeSave,
  inspectSave,
  MAX_FILE_BYTES,
  outputName,
  parseAmount,
  patchSave,
  VERIFIED,
  type Targets,
} from "./core.ts";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "40k": { type: "string" },
      aos: { type: "string" },
      output: { type: "string", short: "o" },
      inspect: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      "allow-unverified-version": { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      `Warhammer Survivors Android save patcher\n\nnode patch-save.mjs <save.sav> --inspect\nnode patch-save.mjs <save.sav> --40k 1000000 --aos 1000000 [-o new.sav]\n\nCreates a new file; never overwrites an existing file.\nFor an unverified game version, review the warning then add --allow-unverified-version.\nVerified: Android ${VERIFIED.androidVersion}, game ${VERIFIED.gameVersion}, versionCode ${VERIFIED.versionCode} (${VERIFIED.date}).`,
    );
    return;
  }
  const [input] = positionals;
  if (!input || positionals.length !== 1)
    throw new Error("Provide one save path. Use --help for usage.");
  // A FIFO must not wait for a writer before we can reject it as a non-file.
  const source = await open(input, constants.O_RDONLY | constants.O_NONBLOCK);
  let text: string;
  try {
    const info = await source.stat();
    if (!info.isFile() || info.size > MAX_FILE_BYTES)
      throw new Error("Choose a regular save file no larger than 5 MiB.");
    // Enforce the cap on the handle too: the file can grow after stat().
    const bytes = Buffer.alloc(MAX_FILE_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await source.read(bytes, length, bytes.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    text = decodeSave(bytes.subarray(0, length));
  } finally {
    await source.close();
  }
  const info = await inspectSave(text);
  for (const warning of info.warnings) console.error(`Warning: ${warning}`);
  if (values.inspect) {
    if (values["40k"] !== undefined || values.aos !== undefined || values.output !== undefined)
      throw new Error("--inspect cannot be combined with patch or output options.");
    console.log(
      JSON.stringify(
        {
          ...info,
          verifiedBuild: VERIFIED,
          note: "versionCode is a device test record. This save cannot identify its APK build.",
        },
        null,
        2,
      ),
    );
    return;
  }
  const targets: Targets = {};
  if (values["40k"] !== undefined) targets.WH_40K = parseAmount(values["40k"]);
  if (values.aos !== undefined) targets.WH_AOS = parseAmount(values.aos);
  const output = resolve(values.output ?? join(dirname(input), outputName(basename(input))));
  if (output === resolve(input))
    throw new Error("Cannot overwrite the original save. Choose another output path.");
  const patched = await patchSave(text, targets, {
    allowUnverifiedVersion: values["allow-unverified-version"] ?? false,
  });
  // Exclusive creation also rejects existing symlinks and hard links to the source.
  const target = await open(output, "wx", 0o600);
  try {
    await target.writeFile(patched, "utf8");
    await target.sync();
  } catch (error) {
    await target.close();
    await rm(output);
    throw error;
  }
  await target.close();
  console.log(
    `Created patched copy: ${output}\nOriginal save preserved. 40K: ${targets.WH_40K ?? info.balances.WH_40K}; AoS: ${targets.WH_AOS ?? info.balances.WH_AOS}`,
  );
}

main().catch((error: unknown) => {
  const exists = error instanceof Error && "code" in error && error.code === "EEXIST";
  console.error(
    exists
      ? "The output already exists and was not overwritten. Choose a different filename."
      : error instanceof Error
        ? error.message
        : "Processing failed. The original save was not overwritten.",
  );
  process.exitCode = 1;
});
