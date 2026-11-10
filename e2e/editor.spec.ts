import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { inspectSave, patchSave } from "../src/core.ts";

declare global {
  interface Window {
    resumeAuditDigest: () => void;
  }
}

function fixture(version = "2.1.4") {
  const raw = `{"SaveGameVersion":"${version}","Platform":"Android","SelectedSiloType":"WH_40K","Coins":268.0,"checksum":"","SilosSaveData":{"WH_40K":{"Coins":268.0,"checksum":"nested"},"WH_AOS":{"Coins":810.0}},"PreserveMe":1.2300}`;
  const hash = createHash("sha256")
    .update(raw.replace(/"checksum":"[a-z0-9]*"/g, '"checksum":""'))
    .digest("hex");
  return raw.replace('"checksum":""', `"checksum":"${hash}"`);
}

for (const offline of [false, true]) {
  test(`${offline ? "standalone offline" : "website"}: valid download, privacy, and stale output invalidation`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
    });
    const requests: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("file:")) requests.push(request.url());
    });
    if (offline) await context.setOffline(true);
    await page.goto(
      offline ? pathToFileURL(resolve("release/warhammer-save-patcher.html")).href : "/",
    );
    await expect(page.getByRole("button", { name: "Create patched copy" })).toBeDisabled();
    const source = fixture();
    await page.getByRole("button", { name: "Choose save", exact: true }).setInputFiles({
      name: "SaveDataUnity.sav",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(source),
    });
    await expect(page.getByText("Format and checksum passed", { exact: false })).toBeVisible();
    const beforePatch = requests.length;
    await page.getByRole("button", { name: "1 billion", exact: true }).click();
    await page.getByRole("button", { name: "Create patched copy" }).click();
    const link = page.getByRole("link", { name: "Download SaveDataUnity.patched.sav" });
    await expect(link).toBeFocused();
    const pending = page.waitForEvent("download");
    await link.click();
    const downloaded = await pending;
    const path = await downloaded.path();
    if (!path) throw new Error("Missing download");
    const actual = await readFile(path, "utf8");
    expect(actual).toBe(await patchSave(source, { WH_40K: 1_000_000_000, WH_AOS: 1_000_000_000 }));
    expect((await inspectSave(actual)).balances.WH_AOS).toBe(1_000_000_000);
    await page.getByLabel("40K coins").fill("1000");
    await expect(link).toHaveCount(0);
    expect(requests.length).toBe(beforePatch);
    if (offline) expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("wrong files, amount errors, unknown versions, and recovery", async ({ page }) => {
  await page.goto("/");
  const file = page.getByRole("button", { name: "Choose save", exact: true });
  await file.setInputFiles({
    name: "wrong-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a save"),
  });
  await expect(page.getByRole("status", { name: "Save check result" })).toContainText(
    "not a valid JSON",
  );
  await expect(page.getByLabel("40K coins")).toBeDisabled();
  await file.setInputFiles({
    name: "unknown.sav",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(fixture("9.9.9")),
  });
  const generate = page.getByRole("button", { name: "Create patched copy" });
  await expect(generate).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByLabel("40K coins").fill("16777217");
  await generate.click();
  await expect(page.getByLabel("40K coins")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("status", { name: "Patch result" })).toContainText("Invalid amount");
  await page.getByLabel("40K coins").fill("0");
  await expect(page.getByLabel("40K coins")).not.toHaveAttribute("aria-invalid", "true");
  await generate.click();
  await expect(page.getByRole("link", { name: "Download unknown.patched.sav" })).toBeVisible();
  await file.setInputFiles({
    name: "new.sav",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(fixture("9.9.9")),
  });
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("link", { name: /Download .*patched/ })).toHaveCount(0);
});

test("version consent cannot invalidate an in-flight patch", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose save", exact: true }).setInputFiles({
    name: "unknown.sav",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(fixture("9.9.9")),
  });
  const consent = page.getByRole("checkbox");
  await consent.check();
  await page.getByLabel("40K coins").fill("1000");
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    const gate = new Promise<void>((resolve) => {
      window.resumeAuditDigest = resolve;
    });
    crypto.subtle.digest = async (...args) => {
      await gate;
      return original(...args);
    };
  });
  await page.getByRole("button", { name: "Create patched copy" }).click();
  await expect(consent).toBeDisabled();
  await page.evaluate(() => window.resumeAuditDigest());
  await expect(page.getByRole("link", { name: "Download unknown.patched.sav" })).toBeVisible();
  await expect(consent).toBeEnabled();
  await consent.uncheck();
  await expect(page.getByRole("link", { name: "Download unknown.patched.sav" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose save", exact: true })).toBeEnabled();
});

test("digest failure restores controls and allows retry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose save", exact: true }).setInputFiles({
    name: "retry.sav",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(fixture("9.9.9")),
  });
  await page.getByRole("checkbox").check();
  await page.getByLabel("40K coins").fill("1000");
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let fail = true;
    crypto.subtle.digest = (...args) => {
      if (fail) {
        fail = false;
        return Promise.reject(new Error("Test digest failure"));
      }
      return original(...args);
    };
  });
  const generate = page.getByRole("button", { name: "Create patched copy" });
  await generate.click();
  await expect(page.getByRole("status", { name: "Patch result" })).toContainText(
    "Test digest failure",
  );
  await expect(page.getByRole("checkbox")).toBeEnabled();
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByRole("link", { name: "Download retry.patched.sav" })).toBeVisible();
});

test("disabled JavaScript explains the requirement and offers the Node tool", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(process.env["TEST_BASE_URL"] ?? "http://127.0.0.1:4173");
    // Playwright's text engine excludes noscript; inspect its rendered descendants directly.
    await expect(page.locator("noscript p")).toBeVisible();
    await expect(page.locator("noscript p")).toContainText("Enable JavaScript");
    await expect(page.locator("noscript a")).toHaveAttribute("href", /releases\/latest$/);
  } finally {
    await context.close();
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`layout at ${width}px with long filename and text spacing`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Choose save", exact: true }).setInputFiles({
      name: "long".repeat(40) + ".sav",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(fixture()),
    });
    await page.addStyleTag({
      content:
        "* { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important; } p { margin-bottom: 2em !important; }",
    });
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.viewport);
    await expect(page.getByRole("button", { name: "Create patched copy" })).toBeEnabled();
  });
}
