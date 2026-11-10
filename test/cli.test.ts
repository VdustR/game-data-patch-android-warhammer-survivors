import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, symlink, link } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vite-plus/test";
import { inspectSave } from "../src/core.ts";

test("CLI preserves originals and existing outputs, including aliases", async () => {
  const folder = await mkdtemp(join(tmpdir(), "warhammer-cli-test-"));
  try {
    const input = join(folder, "SaveDataUnity.sav");
    const unsigned =
      '{"SaveGameVersion":"2.1.4","Platform":"Android","SelectedSiloType":"WH_40K","Coins":10.0,"checksum":"","SilosSaveData":{"WH_40K":{"Coins":10.0},"WH_AOS":{"Coins":5.0}}}';
    const original = unsigned.replace(
      '"checksum":""',
      '"checksum":"' + createHash("sha256").update(unsigned).digest("hex") + '"',
    );
    await writeFile(input, original);
    const cli = fileURLToPath(new URL("../dist/patch-save.mjs", import.meta.url));
    const invoke = (args: string[]) =>
      spawnSync(process.execPath, [cli, input, ...args], { encoding: "utf8" });
    assert.equal(invoke(["--40k", "1000000", "--aos", "1000000"]).status, 0);
    const output = join(folder, "SaveDataUnity.patched.sav");
    const generated = await readFile(output, "utf8");
    assert.deepEqual((await inspectSave(generated)).balances, {
      WH_40K: 1_000_000,
      WH_AOS: 1_000_000,
    });
    assert.equal(invoke(["--40k", "20"]).status, 1);
    assert.equal(await readFile(output, "utf8"), generated);
    assert.equal(invoke(["--40k", "20", "-o", input]).status, 1);
    const soft = join(folder, "symlink.sav"),
      hard = join(folder, "hardlink.sav");
    await symlink(input, soft);
    await link(input, hard);
    for (const alias of [soft, hard]) assert.equal(invoke(["--40k", "20", "-o", alias]).status, 1);
    assert.equal(invoke(["--40k", "not-money", "-o", join(folder, "invalid.sav")]).status, 1);
    assert.equal(await readFile(input, "utf8"), original);
    assert.match(
      execFileSync(process.execPath, [cli, input, "--inspect"], { encoding: "utf8" }),
      /178089/,
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test(
  "CLI rejects a FIFO without waiting for a writer",
  { skip: process.platform === "win32" },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), "warhammer-fifo-test-"));
    try {
      const input = join(folder, "wrong.sav");
      execFileSync("mkfifo", [input]);
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("../src/cli.ts", import.meta.url)), input, "--inspect"],
        { encoding: "utf8", timeout: 3000 },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /regular save/);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  },
);
