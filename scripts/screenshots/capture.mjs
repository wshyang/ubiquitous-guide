/**
 * Calibration screenshot: renders the scene at a frozen simulated time and saves a PNG.
 *
 *   CHROME_PATH=/path/to/chrome node scripts/screenshots/capture.mjs \
 *     --url http://localhost:3000 --t 4000 --out /tmp/scene.png [--width 1376 --height 768]
 *
 * Use --t to compare the same moment across calibration rounds.
 */
import { parseArgs } from "node:util";
import puppeteer from "puppeteer-core";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    t: { type: "string", default: "4000" },
    out: { type: "string", default: "scene.png" },
    width: { type: "string", default: "1376" },
    height: { type: "string", default: "768" },
  },
});

const executablePath = process.env.CHROME_PATH;
if (!executablePath) {
  throw new Error("set CHROME_PATH to a Chromium binary");
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--disable-gpu-sandbox"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("pageerror:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("console:", message.text());
  });
  await page.setViewport({ width: Number(values.width), height: Number(values.height), deviceScaleFactor: 1 });
  const separator = values.url.includes("?") ? "&" : "?";
  await page.goto(`${values.url}${separator}t=${values.t}`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === "true" || document.body.dataset.error, { timeout: 120000 });
  const error = await page.evaluate(() => document.body.dataset.error ?? "");
  if (error) throw new Error(error);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.screenshot({ path: values.out });
  console.log(`saved ${values.out}`);
} finally {
  await browser.close();
}
