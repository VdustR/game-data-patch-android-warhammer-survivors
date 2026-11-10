import { findNodeAtLocation, parseTree, type Node, type ParseError } from "jsonc-parser";
import { z } from "zod";

export const VERIFIED = {
  gameVersion: "2.1.4",
  versionCode: 178089,
  androidVersion: "17",
  packageName: "com.AurochDigital.WarhammerSurvivors",
  date: "2026-11-10",
} as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_COINS = 1_000_000_000;
// Large amounts must also survive the game's single-precision representation exactly.
const targetAmountSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_COINS)
  .refine((value) => Math.fround(value) === value);
const universeSchema = z.enum(["WH_40K", "WH_AOS"]);
export type Universe = z.infer<typeof universeSchema>;
export type Targets = Partial<Record<Universe, number>>;
const balanceSchema = z.number().finite().nonnegative();
const siloSchema = z.object({ Coins: balanceSchema });
const saveSchema = z.object({
  SaveGameVersion: z.string().min(1).max(80),
  Platform: z.literal("Android"),
  SelectedSiloType: universeSchema,
  Coins: balanceSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  SilosSaveData: z.object({ WH_40K: siloSchema, WH_AOS: siloSchema }),
});
const targetsSchema = z.strictObject({
  WH_40K: targetAmountSchema.optional(),
  WH_AOS: targetAmountSchema.optional(),
});

export interface SaveInfo {
  version: string;
  verifiedVersion: boolean;
  platform: "Android";
  selectedUniverse: Universe;
  balances: Record<Universe, number>;
  rootBalance: number;
  warnings: string[];
}

export function decodeSave(bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new Error("This file exceeds 5 MiB. Check that you selected a game save.");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(
      "The file has a UTF-8 BOM, unlike the verified save format. Use a file written directly by the game.",
    );
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The file is not valid UTF-8 text. Choose SaveDataUnity.sav.");
  }
}

function checkTree(node: Node, depth = 0): void {
  if (depth > 64) throw new Error("The JSON is nested too deeply to recognize as a save.");
  if (node.type === "object") {
    const seen = new Set<string>();
    for (const property of node.children ?? []) {
      const key: unknown = property.children?.[0]?.value;
      if (typeof key !== "string") throw new Error("Invalid JSON field name.");
      if (seen.has(key))
        throw new Error(
          `Duplicate JSON field “${key.slice(0, 80)}”. The file cannot be safely patched.`,
        );
      seen.add(key);
    }
  }
  for (const child of node.children ?? []) checkTree(child, depth + 1);
}

function readSave(text: string) {
  if (!text.trim() || new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new Error("The file is empty or exceeds 5 MiB. Choose a game save again.");
  }
  const errors: ParseError[] = [];
  let tree: Node | undefined;
  try {
    tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  } catch {
    throw new Error("The file structure could not be parsed as JSON.");
  }
  if (!tree || tree.type !== "object" || errors.length) {
    throw new Error(
      "The file is not a valid JSON object. Choose a game .sav file, not an APK, image, or archive.",
    );
  }
  checkTree(tree);
  const value: unknown = JSON.parse(text);
  const result = saveSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "root";
    if (path === "Platform")
      throw new Error("No Android platform marker found. This tool supports Android saves only.");
    if (path === "checksum")
      throw new Error("Missing a valid checksum. Use the complete original save.");
    throw new Error(
      `Missing or invalid save field (${path}). Both world balances and the selected world are required.`,
    );
  }
  // JSON key escapes or whitespace at this particular field change the game's regex behavior.
  const checksum = findNodeAtLocation(tree, ["checksum"]);
  const property = checksum?.parent;
  if (
    !property ||
    text.slice(property.offset, property.offset + property.length) !==
      `"checksum":"${result.data.checksum}"`
  ) {
    throw new Error(
      "The checksum field formatting differs from the game format. Use the original save without reformatting it.",
    );
  }
  return { tree, data: result.data };
}

async function digest(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "SHA-256 is unavailable. Open the offline HTML in a current Chrome browser, or use localhost or HTTPS.",
    );
  const bytes = new TextEncoder().encode(text.replace(/"checksum":"[a-z0-9]*"/g, '"checksum":""'));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function inspectSave(text: string): Promise<SaveInfo> {
  const { data } = readSave(text);
  if ((await digest(text)) !== data.checksum) {
    throw new Error(
      "Checksum mismatch: the file may be edited, damaged, or use a different format. Use the original save or a backup.",
    );
  }
  const verifiedVersion = data.SaveGameVersion === VERIFIED.gameVersion;
  return {
    version: data.SaveGameVersion,
    verifiedVersion,
    platform: data.Platform,
    selectedUniverse: data.SelectedSiloType,
    rootBalance: data.Coins,
    balances: { WH_40K: data.SilosSaveData.WH_40K.Coins, WH_AOS: data.SilosSaveData.WH_AOS.Coins },
    warnings: verifiedVersion
      ? []
      : [
          `Game version ${data.SaveGameVersion} has not been device-tested. The tested version is ${VERIFIED.gameVersion}. This file passed basic structure and checksum checks, but the game may not read the patched copy.`,
        ],
  };
}

function replaceValue(text: string, tree: Node, path: string[], value: string): string {
  const node = findNodeAtLocation(tree, path);
  if (!node) throw new Error(`Required field not found: ${path.join(".")}.`);
  return text.slice(0, node.offset) + value + text.slice(node.offset + node.length);
}

export async function patchSave(
  text: string,
  targets: Targets,
  options: { allowUnverifiedVersion?: boolean } = {},
): Promise<string> {
  const info = await inspectSave(text);
  if (!info.verifiedVersion && !options.allowUnverifiedVersion)
    throw new Error("Unverified game version. Acknowledge the version warning before continuing.");
  const parsed = targetsSchema.safeParse(targets);
  if (!parsed.success)
    throw new Error(
      `Amounts must be integers from 0 to ${MAX_COINS.toLocaleString("en-US")} that the game can store exactly in single precision. Only 40K and AoS are supported.`,
    );
  if (parsed.data.WH_40K === undefined && parsed.data.WH_AOS === undefined)
    throw new Error("Specify a coin amount for at least one world.");
  let output = text;
  for (const universe of universeSchema.options) {
    const value = parsed.data[universe];
    if (value === undefined) continue;
    // Retain numeric text when the value already matches; do not rewrite unrelated tokens.
    if (value !== info.balances[universe])
      output = replaceValue(
        output,
        readSave(output).tree,
        ["SilosSaveData", universe, "Coins"],
        `${value}.0`,
      );
    if (universe === info.selectedUniverse && value !== info.rootBalance)
      output = replaceValue(output, readSave(output).tree, ["Coins"], `${value}.0`);
  }
  output = replaceValue(
    output,
    readSave(output).tree,
    ["checksum"],
    JSON.stringify(await digest(output)),
  );
  const checked = await inspectSave(output);
  for (const universe of universeSchema.options) {
    if (checked.balances[universe] !== (parsed.data[universe] ?? info.balances[universe]))
      throw new Error("Output verification failed. No patched file was created.");
  }
  return output;
}

export function parseAmount(value: string): number {
  if (!/^\d+$/.test(value))
    throw new Error("Enter a whole number without commas, decimal points, or signs.");
  const result = targetAmountSchema.safeParse(Number(value));
  if (!result.success)
    throw new Error(
      `Enter an amount from 0 to ${MAX_COINS.toLocaleString("en-US")} that does not round in single precision. For a large amount, use 1,000,000,000.`,
    );
  return result.data;
}

export function outputName(inputName: string): string {
  return inputName.replace(/\.sav$/i, "") + ".patched.sav";
}
