import { expect, test } from "@playwright/test";

const canonical = "https://vdustr.github.io/game-data-patch-android-warhammer-survivors/";

test("initial HTML exposes the English tool, evidence, and discovery metadata without JavaScript", async ({
  browser,
  request,
  baseURL,
}) => {
  const response = await request.get("./");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('lang="en"');
  expect(html).toContain('id="compatibility"');
  expect(html).toContain('id="save-privacy"');
  if (!baseURL) throw new Error("Missing browser test base URL");
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("./");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Warhammer Survivors");
    await expect(page.locator("#compatibility")).toContainText("178089");
    await expect(page.locator("#save-privacy")).toContainText("never uploaded");
    await expect(page.locator("#cloud-saves")).toContainText("unverified");
    await expect(page.locator('input[type="file"]')).toBeDisabled();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(schema).toMatchObject({
      "@type": "WebApplication",
      url: canonical,
      inLanguage: "en",
      isAccessibleForFree: true,
    });
    expect(schema).not.toHaveProperty("aggregateRating");
  } finally {
    await context.close();
  }
  const sitemap = await request.get("./sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${canonical}</loc>`);
});
