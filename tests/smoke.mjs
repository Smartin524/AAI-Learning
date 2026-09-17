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

  await page.getByRole("link", { name: /CA6002 · AI UX & Data Visualisation Design Principles/ }).click();
  await page.waitForURL(`**/${config.courses[2].entry}`);
  assert(await page.locator("body").getAttribute("data-course-id") === config.courses[2].id, "AI UX course identity is incorrect");
  const aiUxPage = config.courses[2].pages[0];
  assert(await page.locator(".chapter-group.active .chapter-subnav a").count() === aiUxPage.subsections.length, "AI UX source chapter subtitles are incomplete");
  assert(new URL(await page.getByRole("link", { name: "1.4 Comparison Plots", exact: true }).getAttribute("href"), page.url()).hash === "#chapter-1-4", "AI UX source chapter anchor is incorrect");
  await page.locator("#chapter-1-7").evaluate((heading) => window.scrollTo(0, heading.offsetTop - 82));
  await page.waitForFunction(() => document.querySelector('[data-toc-section="chapter-1-7"]')?.getAttribute("aria-current") === "location");
  assert(new URL(page.url()).hash === "", "Scroll spy should not rewrite the URL hash");

  await page.getByRole("button", { name: "课程切换" }).click();
  const pythonLink = page.getByRole("link", { name: /Python 常用方法/ });
  assert((await pythonLink.getAttribute("href")) === "../chapters/01-basics.html", "Python menu link is incorrect");
  await pythonLink.click();
  await page.waitForURL("**/chapters/01-basics.html");
  assert(await page.getByRole("heading", { name: "内置函数与类型转换" }).isVisible(), "Python first chapter did not render");
  assert(await page.locator(".chapter-group.active").count() === 1, "Exactly one chapter should be expanded");
  assert(await page.locator(".chapter-group.active .chapter-subnav a").count() === config.courses[0].pages[0].subsections.length, "Current chapter subtitles are incomplete");
  assert(await page.locator(".chapter-group:not(.active) .chapter-subnav[inert]").count() === config.courses[0].pages.length - 1, "Inactive chapter subtitles are not collapsed");
  const tocTransition = await page.locator(".chapter-group.active .chapter-subnav").evaluate((element) => getComputedStyle(element).transitionDuration);
  assert(tocTransition.includes("0.12s"), "Current chapter subtitle transition is missing");

  const navigationEntries = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  const faviconBeforeChapterSwitch = await page.locator('link[rel="icon"]').getAttribute("href");
  await page.getByRole("link", { name: "02 容器方法", exact: true }).click();
  await page.waitForURL("**/chapters/02-containers.html");
  await page.getByRole("heading", { name: "容器：list、dict、set、tuple" }).waitFor();
  assert(await page.evaluate(() => performance.getEntriesByType("navigation").length) === navigationEntries, "Chapter switch performed a full-page navigation");
  assert(await page.locator('link[rel="icon"]').getAttribute("href") === faviconBeforeChapterSwitch, "Chapter switch replaced the favicon");
  assert(await page.locator(".chapter-group.active .chapter-link").innerText() === "02 容器方法", "New chapter did not expand in the table of contents");
  assert(await page.locator(".code-block").count() > 0, "Code blocks were not enhanced after the chapter switch");
  assert(await page.getByRole("button", { name: "复制代码" }).count() === 0, "Python reference copy buttons should be hidden");

  await page.goBack();
  await page.waitForURL("**/chapters/01-basics.html");
  await page.getByRole("heading", { name: "内置函数与类型转换" }).waitFor();
  assert(await page.locator(".chapter-group.active .chapter-link").innerText() === "01 内置函数", "Browser history did not restore the previous chapter");
  assert(await page.evaluate(() => performance.getEntriesByType("navigation").length) === navigationEntries, "Browser history caused a full-page navigation");

  await page.getByRole("button", { name: /模式$/ }).click();
  await page.getByRole("menuitemradio", { name: "夜间模式" }).click();
  assert(await page.locator("html").getAttribute("data-color-mode") === "dark", "Theme did not switch to dark mode");

  await page.getByRole("link", { name: "数字与进制", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.chapter-group.active [data-toc-section="numbers"]')?.getAttribute("aria-current") === "location");
  const anchorState = await page.evaluate(() => ({
    hash: location.hash,
    behavior: getComputedStyle(document.documentElement).scrollBehavior,
    targetTop: document.querySelector("#numbers").getBoundingClientRect().top,
  }));
  assert(anchorState.hash === "#numbers", "Section anchor did not update the URL");
  assert(await page.getByRole("link", { name: "数字与进制", exact: true }).getAttribute("aria-current") === "location", "Current subtitle state did not follow the URL hash");
  assert(anchorState.behavior === "auto", "Section navigation is not immediate");
  assert(Math.abs(anchorState.targetTop - 82) < 3, "Section anchor landed at the wrong offset");

  // Verify speculative loads, shared requests, retries and stale navigation.
  const warmContext = await browser.newContext();
  const warm = await warmContext.newPage();
  const chapterRequests = new Map();
  let releaseSlow;
  const slowGate = new Promise((resolve) => { releaseSlow = resolve; });
  let slowStarted = false;
  let slowCompleted = false;
  const failedPath = '/chapters/03-control-flow.html';
  const slowPath = '/chapters/04-functions.html';
  await warm.route('**/chapters/*.html', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const count = (chapterRequests.get(pathname) ?? 0) + 1;
    chapterRequests.set(pathname, count);
    if (pathname === failedPath && count === 1) {
      await route.fulfill({ status: 503, body: 'Temporary failure' });
      return;
    }
    if (pathname === slowPath) {
      slowStarted = true;
      await slowGate;
    }
    const body = await readFile(path.join(root, pathname.slice(1)), 'utf8');
    await route.fulfill({ status: 200, contentType: 'text/html', body });
    if (pathname === slowPath) slowCompleted = true;
  });
  const until = async (condition, message) => {
    const deadline = Date.now() + 10000;
    while (!condition() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert(condition(), message);
  };
  try {
    await warm.goto(`${baseUrl}/chapters/01-basics.html`);
    await until(() => chapterRequests.size === config.courses[0].pages.length && slowStarted, 'Other chapters were not loaded in the background');
    assert(new URL(warm.url()).pathname === '/chapters/01-basics.html', 'Preloading changed the current page');
    await warm.getByRole('link', {name:'04 遍历与函数工具', exact:true}).click();
    await warm.getByRole('link', {name:'01 内置函数', exact:true}).click();
    releaseSlow();
    await until(() => slowCompleted, 'Slow preload did not finish');
    await warm.waitForTimeout(100);
    assert(new URL(warm.url()).pathname === '/chapters/01-basics.html', 'Cancelled navigation replaced the current chapter');
    await warm.getByRole('link', {name:'03 字符串', exact:true}).click();
    await warm.getByRole('heading', {name:'字符串常用方法', exact:true}).waitFor();
    assert(chapterRequests.get(failedPath) === 2, 'Failed preload was not retried on click');
    await warm.getByRole('link', {name:'04 遍历与函数工具', exact:true}).click();
    await warm.getByRole('heading', {name:'遍历、排序与函数工具', exact:true}).waitFor();
    assert(chapterRequests.get(slowPath) === 1, 'Click duplicated the in-flight preload request');
    await warm.unroute('**/chapters/*.html');
    const unexpectedRequests = [];
    await warm.route('**/chapters/*.html', route => {
      unexpectedRequests.push(route.request().url());
      return route.abort();
    });
    await warmContext.setOffline(true);
    for (const label of ['02 容器方法', '01 内置函数', '02 容器方法']) {
      await warm.getByRole('link', {name:label, exact:true}).click();
      await warm.waitForFunction(expected => document.querySelector('.chapter-link[aria-current="page"]')?.textContent === expected, label);
      assert(await warm.locator('.chapter .code-block').count() > 0, 'Cached document lost its chapter content');
      assert(await warm.locator('.chapter .code-block .code-block').count() === 0, 'Cached code wrappers were duplicated');
    }
    assert(unexpectedRequests.length === 0, 'A cached chapter attempted another network request');
  } finally {
    releaseSlow();
    await warmContext.close();
  }

  await page.goto(`${baseUrl}/chapters/07-numpy-vectors.html`);
  assert(await page.locator('.chapter-hero pre').textContent() === 'import numpy as np', "NumPy import instructions are missing");
  assert(!(await page.locator('.chapter-hero').textContent()).includes('不应整块顺序运行'), "Removed boilerplate remains");
  await page.getByRole("link", { name: "13 SQL 常用语法", exact: true }).click();
  await page.getByRole("heading", { name: "SQL 常用语法", exact: true }).waitFor();
  assert(await page.locator('pre[data-language="sql"]').count() === 18, "SQL blocks missing");
  assert(await page.locator('pre .syntax-keyword').filter({hasText: /^SELECT$/}).count() > 0, "SQL keywords not highlighted");
  assert(await page.locator('pre .syntax-comment').first().textContent() === "-- 查询指定列；别名", "SQL comment highlighting is incorrect");
  assert(await page.getByRole("button", { name: "复制代码" }).count() === 0, "SQL reference copy buttons should be hidden");
  await page.getByRole("link", {name: "窗口函数", exact: true}).click();
  assert(new URL(page.url()).hash === "#windows", "SQL section navigation failed");
  const blocks = await page.locator('#windows .code-block').evaluateAll(elements => elements.map(e => {const r=e.getBoundingClientRect(); return {x:r.x,y:r.y};}));
  assert(blocks.length === 2 && blocks[0].y === blocks[1].y && blocks[1].x > blocks[0].x, "SQL blocks should be side by side");
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "SQL page overflows on mobile");

  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(" | ")}`);
  console.log("Smoke test passed: home, course switch, theme, and section navigation.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
