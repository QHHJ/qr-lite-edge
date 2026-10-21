// Run after build:edge. Uses the existing puppeteer and ZXing dependencies.
import puppeteer from "puppeteer";
import { QRCodeWriter, BarcodeFormat } from "@zxing/library";
import path from "node:path";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import http from "node:http";

const output = path.resolve(".local/edge-test");
await fs.mkdir(output, { recursive: true });
const extension = path.resolve("dist/edge");
const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  pipe: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--no-first-run", "--enable-unsafe-extension-debugging"],
});
let server;
try {
  const target = await browser.waitForTarget(t => t.type() === "service_worker", { timeout: 30000 });
  const origin = target.url().replace(/\/background\.js$/, "");
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const external = [];
  page.on("request", r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  await page.setViewport({ width: 900, height: 750 });
  await page.goto(`${origin}/pages/popup.html`);
  await page.waitForSelector('input[type="file"]');
  const contents = ["https://example.com/qr-lite-test", "QR Lite local multi-code test"];
  const writer = new QRCodeWriter();
  const matrices = contents.map(content => {
    const matrix = writer.encode(content, BarcodeFormat.QR_CODE, 260, 260, new Map());
    return Array.from({ length: 260 }, (_, y) => Array.from({ length: 260 }, (_, x) => matrix.get(x, y)));
  });
  const dataUrl = await page.evaluate(matrices => {
    const canvas = document.createElement("canvas");
    canvas.width = 640; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, 640, 320);
    ctx.fillStyle = "black";
    matrices.forEach((matrix, i) => matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) ctx.fillRect(30 + i * 320 + x, 30 + y, 1, 1);
    })));
    return canvas.toDataURL();
  }, matrices);
  const fixture = path.join(output, "two-codes.png");
  await fs.writeFile(fixture, Buffer.from(dataUrl.split(",")[1], "base64"));
  await (await page.$('input[type="file"]')).uploadFile(fixture);
  await page.waitForFunction(() => document.querySelectorAll('.qr-results button').length === 2, { timeout: 60000 });
  assert.equal(await page.$$eval('svg [role="button"]', nodes => nodes.length), 2);
  const detected = await page.$$eval('.qr-results button', nodes => nodes.map(n => n.title));
  assert.deepEqual(detected.sort(), [...contents].sort());
  await page.click('.qr-results button:nth-child(2)');
  const chosen = await page.$eval('.qr-results button:nth-child(2)', el => el.title);
  assert.equal(await page.$eval('textarea.output', el => el.value), chosen);
  await page.click('svg [role="button"]');
  const first = await page.$eval('.qr-results button', el => el.title);
  assert.equal(await page.$eval('textarea.output', el => el.value), first);
  await browser.defaultBrowserContext().overridePermissions(origin, ["clipboard-read", "clipboard-write"]);
  await page.click('.footer.actions2 a');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), first);
  console.log("Copy selected result: PASS");
  await page.screenshot({ path: path.join(output, "multi-result.png") });
  // The same image enters the existing paste and new drop paths.
  for (const type of ["paste", "drop"]) {
    const previous = await page.$eval('#scanInputImage', el => el.src);
    await page.evaluate(async (dataUrl, type) => {
      const file = new File([await (await fetch(dataUrl)).blob()], "fixture.png", { type: "image/png" });
      const data = new DataTransfer(); data.items.add(file);
      const event = type === "paste"
        ? new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
        : new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true });
      document.querySelector('.container').dispatchEvent(event);
    }, dataUrl, type);
    await page.waitForFunction(previous => document.querySelector('#scanInputImage')?.src !== previous, {}, previous);
    await page.waitForFunction(() => document.querySelectorAll('.qr-results button').length === 2);
  }
  assert.deepEqual(external, [], "Decoding must not request remote resources");
  assert.deepEqual(errors, []);
  server = http.createServer((req, res) => {
    if (req.url === "/image.png") {
      res.setHeader("Content-Type", "image/png");
      res.end(Buffer.from(dataUrl.split(",")[1], "base64"));
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end('<html><body style="margin:0;background:white"><img style="margin-top:80px" src="/image.png" width="640" height="320"></body></html>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const web = await browser.newPage();
  await web.setViewport({ width: 900, height: 750, deviceScaleFactor: 1.5 });
  await web.goto(`http://127.0.0.1:${server.address().port}`);
  const cdp = await browser.target().createCDPSession();
  const { targetInfos } = await cdp.send("Target.getTargets", { filter: [{ type: "tab", exclude: false }] });
  const targetInfo = targetInfos.find(t => t.url === web.url());
  await cdp.send("Extensions.triggerAction", { id: new URL(target.url()).hostname, targetId: targetInfo.targetId });
  const popupTarget = await browser.waitForTarget(t => t.url().includes('/pages/popup.html') && t !== page.target());
  const popup = await popupTarget.asPage();
  await popup.waitForSelector('.scan-tools button');
  await popup.click('.scan-tools button');
  await popup.waitForFunction(() => document.querySelectorAll('.qr-results button').length === 2, { timeout: 60000 });
  console.log("Visible page screenshot: PASS (DPR 1.5)");
  await popup.close();
  await web.bringToFront();
  await page.evaluate(() => chrome.runtime.sendMessage({ action: "BG_INJECT_PICKER_LOADER" }));
  await web.waitForSelector('iframe');
  const pickerElement = await web.$('iframe');
  const picker = await pickerElement.contentFrame();
  await picker.waitForSelector('.mask');
  await web.mouse.move(5, 55);
  await web.mouse.down();
  await web.mouse.move(660, 410, { steps: 15 });
  await web.mouse.up();
  try {
    await picker.waitForFunction(() => document.querySelectorAll('.qr-results button').length === 2, { timeout: 20000 });
  } catch (e) {
    await web.screenshot({ path: path.join(output, "region-failed.png") });
    console.log(await picker.evaluate(() => document.body.innerText));
    throw e;
  }
  await picker.waitForFunction(() => getComputedStyle(document.querySelector('#result')).opacity === "1"
    && Math.abs(document.querySelector('.input-image-container').getBoundingClientRect().width - 500) < 1);
  await web.screenshot({ path: path.join(output, "region-result.png") });
  console.log("Drag region screenshot: PASS (DPR 1.5)");
  await web.keyboard.press('Escape');
  await web.waitForFunction(() => !document.querySelector('iframe'));
  // Exercise the original injected image retriever with real tab permissions.
  // Native context-menu clicking itself requires a manual browser UI check.
  const worker = await target.worker();
  const imageUrl = `http://127.0.0.1:${server.address().port}/image.png`;
  await page.evaluate(() => {
    globalThis.receivedImage = null;
    chrome.runtime.onMessage.addListener(request => {
      if (request.action === "POPUP_RECEIVE_IMAGE") globalThis.receivedImage = request;
    });
  });
  const source = await fs.readFile('src/pages/components/ImageScanner.js', 'utf8');
  const retriever = source.slice(source.indexOf('const imageRetriever = ') + 'const imageRetriever = '.length, source.indexOf('\n/**'));
  const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id);
  await worker.evaluate(`chrome.scripting.executeScript({func: (${retriever.replace(/;\s*$/, '')}), args: [{url: ${JSON.stringify(imageUrl)}, id: 'test'}, false], target: {tabId: ${tabId}}})`);
  await page.waitForFunction(() => globalThis.receivedImage?.image);
  assert.equal(await page.evaluate(() => globalThis.receivedImage.image.startsWith('data:image/png')), true);
  console.log("Right-click image retriever (same origin): PASS");
  console.log(JSON.stringify({ browser: await browser.version(), detected, externalRequests: external, errors, output }, null, 2));
} finally {
  server?.close();
  await browser.close();
}
