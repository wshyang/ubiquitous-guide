import { expect, test } from "@playwright/test";

test("scene loads, animates, and controls respond", async ({ page }) => {
  await page.goto("/?seed=20261017");
  const canvas = page.getByTestId("app__canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("app__loading")).toBeHidden();

  const frameAt = async () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().length);
  const first = await frameAt();
  await page.waitForTimeout(600);
  expect(await frameAt()).not.toBe(first); // animation is actually advancing

  await page.getByTestId("controls__pause").click();
  await expect(page.getByTestId("controls__pause")).toHaveText("Play");
  await page.getByTestId("controls__view").click();
  await expect(page.getByTestId("controls__view")).toContainText("lab");
  await page.getByTestId("controls__anchors").click();
  await expect(page.getByTestId("controls__anchors")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/lab-with-anchors.png" });
});

test("sprite atlas lists every extracted sprite", async ({ page }) => {
  await page.goto("/sprites-atlas.html");
  await expect(page.locator("figure")).toHaveCount(313);
});

test("public sprite URLs resolve", async ({ request }) => {
  for (const url of ["/sprites/dragon-boats/dragon-boat-red.png",
                     "/sprites/paddles/paddle-wood-07.png",
                     "/backdrops/kallang-day-clean.jpeg"]) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
  }
});
