import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, ".."),
  out = resolve(root, "artifacts");
await mkdir(out, { recursive: true });
const chrome =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9346;
const origin = process.env.PREVIEW_URL || "http://127.0.0.1:4322";
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${resolve(root, ".browser-profile")}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (
        await fetch(`http://127.0.0.1:${port}/json/list`)
      ).json();
      if (targets.length) break;
    } catch {}
    await pause(200);
  }
  if (!targets) throw new Error("Chrome did not start");
  ws = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map(),
    errors = [];
  ws.onmessage = ({ data }) => {
    const r = JSON.parse(data);
    if (r.id) {
      const p = pending.get(r.id);
      pending.delete(r.id);
      r.error ? p.reject(r.error) : p.resolve(r.result);
    } else if (r.method === "Runtime.exceptionThrown")
      errors.push(r.params.exceptionDetails.text);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  };
  const navigate = async (path) => {
    await send("Page.navigate", { url: `${origin}${path}` });
    for (let i = 0; i < 40; i++) {
      await pause(100);
      if (
        await evaluate(
          "document.readyState==='complete' && !!document.querySelector('main')",
        )
      )
        break;
    }
    await evaluate("document.fonts.ready");
    await evaluate(
      "Promise.all([...document.images].filter(i=>i.loading!=='lazy'&&i.getAttribute('src')).map(i=>i.decode().catch(()=>{})))",
    );
  };
  const check = async (expr, label) => {
    assert.ok(await evaluate(expr), label);
    console.log("PASS", label);
  };
  const screenshot = async (name) => {
    const r = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(resolve(out, name), Buffer.from(r.data, "base64"));
  };
  await send("Page.enable");
  await send("Runtime.enable");
  for (const [width, height, mobile] of [
    [1440, 1000, false],
    [834, 1112, false],
    [390, 844, true],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
    await navigate("/");
    await check(
      "document.documentElement.scrollWidth <= innerWidth",
      `${width}: no horizontal overflow`,
    );
    await check(
      "document.querySelector('.home-cover').getBoundingClientRect().height===innerHeight",
      `${width}: full-screen cover`,
    );
    await check(
      "document.querySelector('.hero-photo').naturalWidth>0",
      `${width}: cover image loaded`,
    );
    await screenshot(`home-${width}.png`);
    await evaluate(
      "document.querySelector('[data-lightbox]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))",
    );
    await check(
      "document.querySelector('#lightbox').open",
      `${width}: cover lightbox opens`,
    );
    await evaluate("document.querySelector('#viewer-image').decode()");
    await check(
      "document.querySelector('#viewer-image').naturalWidth>0",
      `${width}: enlarged photo loaded`,
    );
    const before = await evaluate(
      "document.querySelector('#viewer-image').src",
    );
    await evaluate("document.querySelector('#viewer-next').click()");
    assert.notEqual(
      await evaluate("document.querySelector('#viewer-image').src"),
      before,
    );
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await pause(100);
    await check(
      "!document.querySelector('#lightbox').open && document.body.style.overflow!== 'hidden'",
      `${width}: Esc closes and restores scrolling`,
    );
    if (mobile) {
      await evaluate("document.querySelector('.menu-toggle').click()");
      await check(
        "document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true' && document.querySelector('main').inert",
        "mobile: accessible menu opens",
      );
      await screenshot("mobile-navigation.png");
      await evaluate("document.querySelector('.menu-toggle').click()");
      await check(
        "!document.querySelector('main').inert",
        "mobile: menu unlocks page",
      );
    }
    for (const path of [
      "/albums/",
      "/albums/kyoto-2026/",
      "/works/",
      "/street/",
      "/journal/",
      "/journal/on-light/",
      "/about/",
    ]) {
      await navigate(path);
      await check(
        "document.documentElement.scrollWidth<=innerWidth",
        `${width}: ${path} fits screen`,
      );
      await check(
        "!!document.querySelector('h1')",
        `${width}: ${path} has heading`,
      );
      if (path === "/albums/") {
        const columns = await evaluate(
          "getComputedStyle(document.querySelector('.album-grid')).gridTemplateColumns.split(' ').length",
        );
        assert.equal(columns, width > 1000 ? 3 : 2);
        await screenshot(`albums-${width}.png`);
      }
    }
  }
  await navigate("/albums/kyoto-2026/");
  await evaluate("document.querySelector('[data-lightbox]').click()");
  const old = await evaluate(
    "document.querySelector('#viewer-count').textContent",
  );
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 290, y: 350 }],
  });
  await send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 110, y: 355 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(100);
  assert.notEqual(
    await evaluate("document.querySelector('#viewer-count').textContent"),
    old,
    "mobile swipe changes photo",
  );
  console.log("PASS mobile swipe changes photo");
  await screenshot("mobile-lightbox.png");
  assert.deepEqual(errors, [], "No JavaScript exceptions");
  await writeFile(
    resolve(out, "browser-check.json"),
    JSON.stringify(
      {
        passed: true,
        widths: [1440, 834, 390],
        javascriptErrors: errors,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("Browser checks passed.");
} finally {
  ws?.close();
  browser.kill();
}
