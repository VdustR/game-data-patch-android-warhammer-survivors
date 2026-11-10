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
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("檔案超過 5 MiB，請確認選到遊戲存檔。");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("檔案含 UTF-8 BOM，與已驗證的存檔格式不同；請使用遊戲直接產生的檔案。");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("檔案不是有效 UTF-8 文字，請選擇 SaveDataUnity.sav。");
  }
}

function checkTree(node: Node, depth = 0): void {
  if (depth > 64) throw new Error("JSON 巢狀層數異常，無法辨識為合理存檔。");
  if (node.type === "object") {
    const seen = new Set<string>();
    for (const property of node.children ?? []) {
      const key: unknown = property.children?.[0]?.value;
      if (typeof key !== "string") throw new Error("JSON 欄位名稱無效。");
      if (seen.has(key)) throw new Error(`JSON 有重複欄位「${key.slice(0, 80)}」，無法安全修改。`);
      seen.add(key);
    }
  }
  for (const child of node.children ?? []) checkTree(child, depth + 1);
}

function readSave(text: string) {
  if (!text.trim() || new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new Error("檔案為空或超過 5 MiB，請重新選擇遊戲存檔。");
  }
  const errors: ParseError[] = [];
  let tree: Node | undefined;
  try {
    tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  } catch {
    throw new Error("檔案結構異常，無法解析 JSON。");
  }
  if (!tree || tree.type !== "object" || errors.length) {
    throw new Error("檔案不是有效 JSON 物件；請選擇遊戲的 .sav 存檔，不能選 APK、圖片或壓縮檔。");
  }
  checkTree(tree);
  const value: unknown = JSON.parse(text);
  const result = saveSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "root";
    if (path === "Platform")
      throw new Error("未找到 Android 平台標記；此工具只支援 Android 存檔。");
    if (path === "checksum") throw new Error("缺少有效的 checksum 校驗碼，請使用完整原始存檔。");
    throw new Error(`存檔缺少必要欄位或格式不符（${path}）；需要 40K、AoS 金額與目前世界資料。`);
  }
  // JSON key escapes or whitespace at this particular field change the game's regex behavior.
  const checksum = findNodeAtLocation(tree, ["checksum"]);
  const property = checksum?.parent;
  if (
    !property ||
    text.slice(property.offset, property.offset + property.length) !==
      `"checksum":"${result.data.checksum}"`
  ) {
    throw new Error("checksum 欄位格式與遊戲格式不同，請使用未經重新排版的原始存檔。");
  }
  return { tree, data: result.data };
}

async function digest(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "瀏覽器無法使用 SHA-256；請以新版 Chrome 開啟離線網頁，或使用 localhost／HTTPS。",
    );
  const bytes = new TextEncoder().encode(text.replace(/"checksum":"[a-z0-9]*"/g, '"checksum":""'));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function inspectSave(text: string): Promise<SaveInfo> {
  const { data } = readSave(text);
  if ((await digest(text)) !== data.checksum) {
    throw new Error("校驗碼不符：檔案可能被改過、損壞，或使用不同校驗格式。請改用原始存檔或備份。");
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
          `檔案版本 ${data.SaveGameVersion} 尚未實機驗證。已驗證版本為 ${VERIFIED.gameVersion}；本檔通過基本結構與校驗碼檢查，仍不保證遊戲能讀取修改結果。`,
        ],
  };
}

function replaceValue(text: string, tree: Node, path: string[], value: string): string {
  const node = findNodeAtLocation(tree, path);
  if (!node) throw new Error(`找不到必要欄位 ${path.join(".")}。`);
  return text.slice(0, node.offset) + value + text.slice(node.offset + node.length);
}

export async function patchSave(
  text: string,
  targets: Targets,
  options: { allowUnverifiedVersion?: boolean } = {},
): Promise<string> {
  const info = await inspectSave(text);
  if (!info.verifiedVersion && !options.allowUnverifiedVersion)
    throw new Error("尚未驗證的遊戲版本；請先確認版本提醒再繼續。");
  const parsed = targetsSchema.safeParse(targets);
  if (!parsed.success)
    throw new Error(
      `金額必須是 0 到 ${MAX_COINS.toLocaleString("en-US")} 的整數，且能以遊戲的單精度數值精確表示；只能指定 40K 或 AoS。`,
    );
  if (parsed.data.WH_40K === undefined && parsed.data.WH_AOS === undefined)
    throw new Error("請指定至少一個世界的金額。");
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
      throw new Error("輸出驗證失敗，沒有產生修改檔。");
  }
  return output;
}

export function parseAmount(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error("金額請輸入整數數字，不含逗號、小數點或正負號。");
  const result = targetAmountSchema.safeParse(Number(value));
  if (!result.success)
    throw new Error(
      `金額須介於 0 與 ${MAX_COINS.toLocaleString("en-US")}，且不能因單精度而四捨五入。大額可用 1,000,000,000。`,
    );
  return result.data;
}

export function outputName(inputName: string): string {
  return inputName.replace(/\.sav$/i, "") + ".patched.sav";
}
