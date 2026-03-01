const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "services-data.json");
const INDEX_PATH = path.join(ROOT, "index.html");
const WATCH_MODE = process.argv.includes("--watch");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function decodeHtml(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function extractBlock(html, startPattern, endPattern) {
  const re = new RegExp(`${startPattern}[\\s\\S]*?${endPattern}`);
  const match = html.match(re);
  if (!match) throw new Error(`Block not found: ${startPattern}..${endPattern}`);
  return match[0];
}

function getSharedLayout() {
  const indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
  return {
    nav: extractBlock(indexHtml, '<nav class="navbar" id="navbar">', "</nav>"),
    footer: extractBlock(indexHtml, '<footer class="footer">', "</footer>"),
  };
}

function buildLandingHtml(pagePath, title, sharedLayout) {
  const depth = pagePath.split("/").length - 1;
  const prefix = "../".repeat(depth);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>${title} | zamok-i</title>
    <meta name="description" content="Посадочная страница услуги: ${title}" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&amp;display=swap" rel="stylesheet" />
    <link href="${prefix}assets/css/styles.css" rel="stylesheet" />
  </head>
  <body>
    ${sharedLayout.nav}

    <section class="hero" id="hero">
      <div class="container">
        <div class="hero__grid">
          <div>
            <div class="hero__label"><div class="hero__label-line"></div><span>Посадочная страница услуги</span></div>
            <h1 class="hero__title">${title}</h1>
            <p class="hero__subtitle">Заполните эту страницу контентом под нужный SEO-кластер.</p>
            <div class="hero__buttons">
              <a class="btn btn--black" href="tel:+79219488172">Позвонить</a>
              <a class="btn btn--white" href="#contact">Оставить заявку</a>
            </div>
          </div>
          <div class="hero__image-wrap">
            <div class="hero__image-box">
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&amp;q=80" alt="${title}" class="grayscale" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="contact" id="contact">
      <div class="container">
        <div class="contact__grid">
          <div>
            <div class="tag" style="margin-bottom: 20px">Связаться</div>
            <h2 class="contact__title">Оставьте <span>заявку</span></h2>
          </div>
          <form class="contact__form" onsubmit="handleForm(event)">
            <div class="form-row">
              <div class="form-group">
                <label for="name">Имя</label>
                <input id="name" type="text" placeholder="Ваше имя" required />
              </div>
              <div class="form-group">
                <label for="phone">Телефон</label>
                <input id="phone" type="tel" placeholder="+7 (900) 000-00-00" required />
              </div>
            </div>
            <button type="submit" class="btn btn--yellow" style="width: 100%; justify-content: center; font-size: 1rem">Отправить заявку →</button>
          </form>
        </div>
      </div>
    </section>

    ${sharedLayout.footer}

    <button class="scroll-top" id="scrollTop" aria-label="Наверх"><span class="material-symbols-outlined">arrow_upward</span></button>
    <script src="${prefix}assets/js/main.js"></script>
  </body>
</html>
`;
}

function collectHtmlFiles(dirPath, out = []) {
  const skipDirs = new Set(["node_modules", ".git", "_pgbackup"]);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      collectHtmlFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) out.push(fullPath);
  }

  return out;
}

function extractTagContent(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(re);
  if (!match) return "";
  return decodeHtml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function reportDuplicateTitlesAndH1() {
  const files = collectHtmlFiles(ROOT);
  const titleMap = new Map();
  const h1Map = new Map();

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);

    const title = extractTagContent(html, "title");
    const h1 = extractTagContent(html, "h1");

    if (title) {
      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title).push(rel);
    }

    if (h1) {
      if (!h1Map.has(h1)) h1Map.set(h1, []);
      h1Map.get(h1).push(rel);
    }
  }

  let warningCount = 0;

  for (const [title, filesWithTitle] of titleMap.entries()) {
    if (filesWithTitle.length < 2) continue;
    warningCount += 1;
    console.warn(`WARNING duplicate <title>: "${title}"`);
    filesWithTitle.forEach((f) => console.warn(`  - ${f}`));
  }

  for (const [h1, filesWithH1] of h1Map.entries()) {
    if (filesWithH1.length < 2) continue;
    warningCount += 1;
    console.warn(`WARNING duplicate <h1>: "${h1}"`);
    filesWithH1.forEach((f) => console.warn(`  - ${f}`));
  }

  if (!warningCount) console.log("duplicate-check: no duplicate <title>/<h1> found");
}

function reportDuplicateServicesData(data) {
  const byTitle = new Map();
  const byPath = new Map();

  data.forEach((item, index) => {
    if (!item || typeof item !== "object") return;

    const row = `#${index + 1}`;
    if (item.title) {
      if (!byTitle.has(item.title)) byTitle.set(item.title, []);
      byTitle.get(item.title).push(row);
    }

    if (item.pagePath) {
      if (!byPath.has(item.pagePath)) byPath.set(item.pagePath, []);
      byPath.get(item.pagePath).push(row);
    }
  });

  for (const [title, rows] of byTitle.entries()) {
    if (rows.length < 2) continue;
    console.warn(`WARNING services-data duplicate title: "${title}" in ${rows.join(", ")}`);
  }

  for (const [pagePath, rows] of byPath.entries()) {
    if (rows.length < 2) continue;
    console.warn(`WARNING services-data duplicate pagePath: "${pagePath}" in ${rows.join(", ")}`);
  }
}

function syncOnce() {
  const data = readJson(DATA_PATH);
  const sharedLayout = getSharedLayout();
  if (!Array.isArray(data)) {
    throw new Error("services-data.json must be an array");
  }

  reportDuplicateServicesData(data);

  let createdCount = 0;
  for (const item of data) {
    if (!item || !item.pagePath || !item.title) continue;

    const fullPath = path.join(ROOT, item.pagePath);
    if (fs.existsSync(fullPath)) continue;

    ensureDir(fullPath);
    fs.writeFileSync(fullPath, buildLandingHtml(item.pagePath, item.title, sharedLayout), "utf8");
    createdCount += 1;
    console.log(`created: ${item.pagePath}`);
  }

  console.log(`sync-services-pages: created ${createdCount} page(s)`);
  reportDuplicateTitlesAndH1();
}

function runSafe() {
  try {
    syncOnce();
  } catch (error) {
    console.error(`sync-services-pages: ${error.message}`);
  }
}

if (WATCH_MODE) {
  runSafe();
  console.log("sync-services-pages: watch mode enabled");

  let timer = null;
  fs.watch(DATA_PATH, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      console.log("sync-services-pages: detected change in services-data.json");
      runSafe();
    }, 150);
  });
} else {
  syncOnce();
}
