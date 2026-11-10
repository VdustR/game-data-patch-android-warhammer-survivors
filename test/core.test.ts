import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "vite-plus/test";
import { decodeSave, inspectSave, MAX_FILE_BYTES, patchSave } from "../src/core.ts";

function fixture() {
  const raw =
    '{"SaveGameVersion":"2.1.4","Platform":"Android","SelectedSiloType":"WH_40K","Coins":810.7002,"checksum":"","extra":1.200e+02,"SilosSaveData":{"WH_40K":{"Coins":810.7002,"checksum":"' +
    "a".repeat(64) +
    '","BoughtPowerups":["STRENGTH"]},"WH_AOS":{"Coins":0.0,"checksum":"' +
    "b".repeat(64) +
    '"}}}';
  return sign(raw);
}

function sign(raw: string) {
  const hash = createHash("sha256")
    .update(raw.replace(/"checksum":"[a-z0-9]*"/g, '"checksum":""'))
    .digest("hex");
  return raw.replace(/"checksum":"[a-z0-9]*"/, '"checksum":"' + hash + '"');
}

test("patches both balances and preserves unrelated lexical representations", async () => {
  const input = fixture();
  const output = await patchSave(input, { WH_40K: 1_000_000, WH_AOS: 1_000_000 });
  const info = await inspectSave(output);
  assert.deepEqual(info.balances, { WH_40K: 1_000_000, WH_AOS: 1_000_000 });
  assert.ok(output.includes('"extra":1.200e+02'));
  assert.ok(output.includes('"BoughtPowerups":["STRENGTH"]'));
  assert.ok(output.includes('"checksum":"' + "a".repeat(64) + '"'));
  assert.equal(output, sign(output));
  assert.equal(await patchSave(output, info.balances), output);
});

test("editing the inactive world leaves active root balance intact", async () => {
  const output = await patchSave(fixture(), { WH_AOS: 42 });
  assert.ok(
    output.startsWith(
      '{"SaveGameVersion":"2.1.4","Platform":"Android","SelectedSiloType":"WH_40K","Coins":810.7002,',
    ),
  );
  assert.deepEqual((await inspectSave(output)).balances, { WH_40K: 810.7002, WH_AOS: 42 });
});

test("rejects corrupt checksums, duplicate keys and invalid values", async () => {
  await assert.rejects(inspectSave(fixture().replace("810.7002", "900.0")), /校驗/);
  await assert.rejects(
    inspectSave(sign(fixture().replace('"Coins":0.0', '"Coins":0.0,"Coins":7.0'))),
    /重複/,
  );
  for (const value of [-1, 0.5, NaN, Infinity, 16_777_217, 1_000_000_001]) {
    await assert.rejects(patchSave(fixture(), { WH_40K: value }), /金額/);
  }
  await assert.rejects(patchSave(fixture(), {}), /指定/);
});

test("unknown versions warn and require explicit opt-in, unrelated fields remain flexible", async () => {
  const unknown = sign(fixture().replace("2.1.4", "9.9.9"));
  assert.equal((await inspectSave(unknown)).warnings.length, 1);
  await assert.rejects(patchSave(unknown, { WH_40K: 42 }), /版本/);
  assert.equal(
    (await inspectSave(await patchSave(unknown, { WH_40K: 42 }, { allowUnverifiedVersion: true })))
      .balances.WH_40K,
    42,
  );
});

test("zero is a supported target", async () => {
  assert.equal((await inspectSave(await patchSave(fixture(), { WH_40K: 0 }))).balances.WH_40K, 0);
});

test("one billion survives single-precision conversion exactly", async () => {
  const output = await patchSave(fixture(), { WH_40K: 1_000_000_000, WH_AOS: 1_000_000_000 });
  const info = await inspectSave(output);
  assert.equal(Math.fround(info.balances.WH_40K), 1_000_000_000);
  assert.equal(info.balances.WH_AOS, 1_000_000_000);
  assert.equal(info.rootBalance, 1_000_000_000);
});

test("rejects wrong files, platform, missing worlds, invalid numbers, and bad UTF-8", async () => {
  for (const raw of ["<html>wrong file</html>", "[]", "", "{", '{"broken":true}']) {
    await assert.rejects(inspectSave(raw));
  }
  await assert.rejects(inspectSave(sign(fixture().replace("Android", "Windows"))), /Android/);
  await assert.rejects(inspectSave(sign(fixture().replace('"WH_AOS":', '"OTHER":'))), /WH_AOS/);
  await assert.rejects(inspectSave(sign(fixture().replace('"Coins":0.0', '"Coins":-1'))), /Coins/);
  await assert.rejects(
    inspectSave(sign(fixture().replace('"Coins":0.0', '"Coins":"10"'))),
    /Coins/,
  );
  assert.throws(() => decodeSave(new Uint8Array([0xff, 0xfe])), /UTF-8/);
  assert.throws(() => decodeSave(new Uint8Array([0xef, 0xbb, 0xbf, 123, 125])), /BOM/);
  assert.throws(() => decodeSave(new Uint8Array(MAX_FILE_BYTES + 1)), /5 MiB/);
});

test("AoS selection updates the root mirror and preserves all other semantic fields", async () => {
  const input = sign(
    fixture().replace('"SelectedSiloType":"WH_40K"', '"SelectedSiloType":"WH_AOS"'),
  );
  const output = await patchSave(input, { WH_40K: 99, WH_AOS: 42 });
  const info = await inspectSave(output);
  assert.equal(info.rootBalance, 42);
  assert.deepEqual(info.balances, { WH_40K: 99, WH_AOS: 42 });
  assert.equal(
    output
      .replace('"Coins":42.0', '"Coins":810.7002')
      .replace('"Coins":99.0', '"Coins":810.7002')
      .replace('"Coins":42.0', '"Coins":0.0')
      .replace(/"checksum":"[a-f0-9]{64}"/, '"checksum":""'),
    input.replace(/"checksum":"[a-f0-9]{64}"/, '"checksum":""'),
  );
});
