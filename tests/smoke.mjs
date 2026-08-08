import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
    if (!(await stat(file)).isFile()) throw new Error("Not a file");

    response.writeHead(200, { "content-type": contentTypes[path.extname(file)] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const browserErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "load" });
  assert(await page.title() === config.site.title, "Home title is incorrect");
  assert(await page.locator(".course-row").count() === config.courses.length, "Home course count does not match site.config.json");

  const assetUrls = await page.locator('link[rel="stylesheet"], script[src]').evaluateAll((elements) => elements.map((element) => element.getAttribute("href") || element.getAttribute("src")));
  assert(assetUrls.every((url) => !url.includes("?v=")), "Manual cache versions remain in generated assets");
  assert(assetUrls.some((url) => /assets\/build\/site\.[a-f0-9]{10}\.css$/.test(url)), "Hashed site stylesheet is missing");

  await page.getByRole("link", { name: /AI UX & Data Visualisation Design Principles/ }).click();
  await page.waitForURL(`**/${config.courses[1].entry}`);
  assert(await page.locator("body").getAttribute("data-course-id") === config.courses[1].id, "AI UX course identity is incorrect");
  const aiUxPage = config.courses[1].pages[0];
  assert(await page.locator(".chapter-group.active .chapter-subnav a").count() === aiUxPage.subsections.length, "AI UX source chapter subtitles are incomplete");
  assert(await page.getByRole("link", { name: "1.4 Comparison Plots", exact: true }).getAttribute("href") === "#chapter-1-4", "AI UX source chapter anchor is incorrect");

  await page.getByRole("button", { name: "课程切换" }).click();
  const pythonLink = page.getByRole("link", { name: /Python 通识/ });
  assert((await pythonLink.getAttribute("href")) === "../chapters/01-basics.html", "Python menu link is incorrect");
  await pythonLink.click();
  await page.waitForURL("**/chapters/01-basics.html");
  assert(await page.getByRole("heading", { name: "变量、基本类型与 Casting" }).isVisible(), "Python first chapter did not render");
  assert(await page.locator(".chapter-group.active").count() === 1, "Exactly one chapter should be expanded");
  assert(await page.locator(".chapter-group.active .chapter-subnav a").count() === config.sections.length, "Current chapter subtitles are incomplete");
  assert(await page.locator(".chapter-group:not(.active) .chapter-subnav[inert]").count() === config.courses[0].pages.length - 1, "Inactive chapter subtitles are not collapsed");
  const tocAnimation = await page.locator(".chapter-group.active .chapter-subnav").evaluate((element) => getComputedStyle(element).animationName);
  assert(tocAnimation === "toc-subnav-reveal", "Current chapter subtitle animation is missing");

  await page.getByRole("button", { name: /模式$/ }).click();
  await page.getByRole("menuitemradio", { name: "夜间模式" }).click();
  assert(await page.locator("html").getAttribute("data-color-mode") === "dark", "Theme did not switch to dark mode");

  await page.getByRole("link", { name: "练习", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('a[href="#practice"]')?.getAttribute("aria-current") === "location");
  const anchorState = await page.evaluate(() => ({
    hash: location.hash,
    behavior: getComputedStyle(document.documentElement).scrollBehavior,
    targetTop: document.querySelector("#practice").getBoundingClientRect().top,
  }));
  assert(anchorState.hash === "#practice", "Section anchor did not update the URL");
  assert(await page.getByRole("link", { name: "练习", exact: true }).getAttribute("aria-current") === "location", "Current subtitle state did not follow the URL hash");
  assert(anchorState.behavior === "auto", "Section navigation is not immediate");
  assert(Math.abs(anchorState.targetTop - 82) < 3, "Section anchor landed at the wrong offset");

  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(" | ")}`);
  console.log("Smoke test passed: home, course switch, theme, and section navigation.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
