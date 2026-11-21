// 每日日历卡片渲染器：从两个日历页面（芒格 / 佛学）提取 DATA，
// 生成适配多种 Kindle 分辨率的纯黑白 PNG（e-ink 友好）。
// 用法: node kindle/render.mjs [YYYY-MM-DD]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const RESOLUTIONS = [
  [600, 800],    // K4 / KT2 / PW1
  [758, 1024],   // PW2
  [1072, 1448],  // PW3 / PW4 / KT8 / KT10 / KT11
  [1236, 1648],  // PW5 / PW6
  [1264, 1680],  // Oasis 2 / 3
];
const ROOT_PX = { 600: 26, 758: 32, 1072: 44, 1236: 50, 1264: 52 };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 两个日历：字段差异在 cardHTML 内兼容（buddhism 用 quote，munger 用 zh + en）
const CALS = [
  { id: "munger", file: "index.html", brand: "芒格日历" },
  { id: "buddhism", file: "buddhism/index.html", brand: "佛法日历" },
];

function loadData(rel) {
  const html = readFileSync(join(REPO, rel), "utf8");
  const m = html.match(/const DATA = (\[[\s\S]*?\]);/);
  if (!m) throw new Error(`cannot extract DATA from ${rel}`);
  return JSON.parse(m[1]);
}

// 与两个网页一致的映射：2026-11-01 为第 0 天，取模循环
function dayIndex(iso) {
  const [y, mo, d] = iso.split("-").map(Number);
  const t1 = Date.UTC(2026, 10, 1);
  const t2 = Date.UTC(y, mo - 1, d);
  return Math.floor((t2 - t1) / 86400000);
}

function todayISO() {
  if (process.argv[2]) return process.argv[2];
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const iso = todayISO();
const [Y, M, D] = iso.split("-").map(Number);
const wd = WEEKDAYS[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()];
const dIdx = dayIndex(iso);

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function cardHTML(cal, item, dayNo, rootPx) {
  const quote = esc(item.quote || item.zh);
  const en = item.en ? `<div class="en">${esc(item.en)}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html { font-size:${rootPx}px; }
  body {
    width:100vw; height:100vh; overflow:hidden;
    background:#fff; color:#000;
    font-family:"Noto Sans CJK SC","Noto Serif CJK SC","Source Han Sans SC","PingFang SC","Microsoft YaHei",sans-serif;
    padding:1.3rem 1.4rem;
    display:flex; flex-direction:column;
  }
  .head { display:flex; justify-content:space-between; align-items:baseline;
          border-bottom:0.12rem solid #000; padding-bottom:0.55rem; }
  .date { font-size:1.05rem; font-weight:700; letter-spacing:0.02em; }
  .dayno { font-size:0.85rem; font-weight:700; }
  .meta { margin-top:0.7rem; font-size:0.82rem; display:flex; gap:1rem; }
  .meta b { border:0.06rem solid #000; padding:0.08rem 0.45rem; font-weight:700; }
  .title { margin-top:0.85rem; font-size:1.55rem; font-weight:900; line-height:1.35; }
  .quote { margin-top:0.8rem; font-size:1.02rem; line-height:1.7; font-weight:500; }
  .en { margin-top:0.5rem; font-size:0.78rem; line-height:1.55; }
  .sec { margin-top:0.85rem; }
  .sec h3 { font-size:0.82rem; font-weight:900; border-bottom:0.06rem solid #000;
            display:inline-block; padding-bottom:0.12rem; margin-bottom:0.4rem; }
  .sec p { font-size:0.92rem; line-height:1.68; }
  .foot { margin-top:auto; padding-top:0.6rem; border-top:0.06rem solid #000;
          font-size:0.78rem; display:flex; justify-content:space-between; }
</style></head><body>
  <div class="head">
    <span class="date">${Y}年${M}月${D}日 · 星期${wd}</span>
    <span class="dayno">第 ${dayNo} 天</span>
  </div>
  <div class="meta"><b>${esc(item.themeLabel)}</b><span>${esc(item.author)}</span></div>
  <div class="title">${esc(item.title)}</div>
  <div class="quote">「${quote}」</div>
  ${en}
  <div class="sec"><h3>洞察</h3><p>${esc(item.insight)}</p></div>
  <div class="sec"><h3>今日践行</h3><p>${esc(item.action)}</p></div>
  <div class="foot"><span>${esc(item.source)}</span><span>${cal.brand}</span></div>
  <script>
    // 内容超高时自动缩小字号，保证单屏完整显示
    (function fit() {
      var r = document.documentElement, n = 0;
      while (document.body.scrollHeight > window.innerHeight + 1 && n < 40) {
        r.style.fontSize = (parseFloat(getComputedStyle(r).fontSize) - 1) + "px";
        n++;
      }
    })();
  </script>
</body></html>`;
}

mkdirSync(join(ROOT, "out"), { recursive: true });
const browser = await chromium.launch();
for (const cal of CALS) {
  const DATA = loadData(cal.file);
  const idx = ((dIdx % DATA.length) + DATA.length) % DATA.length;
  const item = DATA[idx];
  const dayNo = idx + 1;
  for (const [w, h] of RESOLUTIONS) {
    const page = await browser.newPage({
      viewport: { width: w, height: h }, deviceScaleFactor: 1,
    });
    await page.setContent(cardHTML(cal, item, dayNo, ROOT_PX[w]), { waitUntil: "load" });
    await page.waitForTimeout(120);
    const out = join(ROOT, "out", `today-${w}x${h}-${cal.id}.png`);
    await page.screenshot({ path: out });
    await page.close();
    console.log("rendered", out);
  }
  console.log(`${cal.id}: ${iso} -> day ${dayNo} "${item.title}"`);
}
await browser.close();
console.log("done");
