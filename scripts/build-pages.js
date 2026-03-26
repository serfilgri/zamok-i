const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INCLUDES_DIR = path.join(ROOT, "includes");
const DATA_PATH = path.join(ROOT, "services-data.json");
const INDEX_PATH = path.join(ROOT, "index.html");
const WATCH_MODE = process.argv.includes("--watch");

// Кэш шаблонов
let templatesCache = null;

/**
 * Загрузка всех шаблонов из папки includes/
 */
function loadTemplates() {
  if (templatesCache) return templatesCache;

  const templates = {
    header: "",
    footer: "",
    head: "",
    sections: {},
  };

  // Загружаем header и footer
  const headerPath = path.join(INCLUDES_DIR, "header.html");
  const footerPath = path.join(INCLUDES_DIR, "footer.html");

  if (fs.existsSync(headerPath)) {
    templates.header = fs.readFileSync(headerPath, "utf8");
  }

  if (fs.existsSync(footerPath)) {
    templates.footer = fs.readFileSync(footerPath, "utf8");
  }

  // Загружаем секции
  const sectionsDir = path.join(INCLUDES_DIR, "sections");
  if (fs.existsSync(sectionsDir)) {
    const files = fs.readdirSync(sectionsDir);
    for (const file of files) {
      if (file.endsWith(".html")) {
        const name = file.replace(".html", "");
        const filePath = path.join(sectionsDir, file);
        templates.sections[name] = fs.readFileSync(filePath, "utf8");
      }
    }
  }

  templatesCache = templates;
  return templates;
}

/**
 * Очистка кэша шаблонов (для watch mode)
 */
function clearTemplatesCache() {
  templatesCache = null;
}

/**
 * Извлечение <head> из index.html
 */
function extractHead(html) {
  const match = html.match(/<head[\s\S]*?<\/head>/);
  if (!match) return "";
  return match[0];
}

/**
 * Построение относительного пути для вложенных страниц
 */
function getRelativePath(pagePath) {
  const depth = pagePath.split("/").filter(Boolean).length - 1;
  if (depth <= 0) return "";
  return "../".repeat(depth);
}

/**
 * Сборка HTML страницы с использованием шаблонов
 */
function buildPage(options) {
  const {
    pagePath,
    title,
    description,
    headExtra = "",
    section = null,
    sectionName = "info-general",
    heroHtml = "",
    mainHtml = "",
    schemaJson = "",
  } = options;

  const templates = loadTemplates();
  const relPath = getRelativePath(pagePath);

  // Формируем <head>
  const head = `  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" as="style" onload="this.onload=null;this.rel='stylesheet'" />
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght;600;700;900&amp;display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
    <link rel="preload" href="${relPath}assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link href="${relPath}assets/css/styles.css" rel="stylesheet" /></noscript>
    <link rel="icon" type="image/svg+xml" href="${relPath}assets/favicon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="${relPath}assets/icons/icon-192.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="${relPath}assets/icons/apple-touch-icon.png" />
    <link rel="manifest" href="${relPath}site.webmanifest" />
    <meta name="theme-color" content="#ffde00" />
    ${headExtra}
  </head>`;

  // Выбираем секцию
  let sectionHtml = "";
  if (section !== false && sectionName) {
    sectionHtml = templates.sections[sectionName] || "";
  }

  // Собираем body
  const bodyContent = `
${templates.header}
${heroHtml}
${mainHtml}
${sectionHtml}
${templates.footer}
    <script src="${relPath}assets/js/main.js?v=${getVersion()}"></script>
    ${schemaJson ? `<script type="application/ld+json">${schemaJson}</script>` : ""}
  `;

  return `<!doctype html>
<html lang="ru">
${head}
  <body>
${bodyContent}
  </body>
</html>
`;
}

/**
 * Получение версии для кэша
 */
function getVersion() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Построение страницы услуги
 */
function buildServicePage(item) {
  const { pagePath, title, description, category } = item;
  const relPath = getRelativePath(pagePath);

  // Определяем тип секции по категории
  const sectionMap = {
    installation: "info-ustanovka",
    repair: "info-remont",
    emergency: "info-vskrytie",
  };
  const sectionName = sectionMap[category] || "info-general";

  // Герой-секция
  const heroHtml = `    <section class="hero">
      <div class="container">
        <div class="hero__grid">
          <div>
            <div class="hero__label">
              <div class="hero__label-line"></div>
              <span>Услуга</span>
            </div>
            <h1 class="hero__title">${title}</h1>
            <p class="hero__subtitle">${description}</p>
            <div class="hero__buttons">
              <a class="btn btn--black" href="tel:+79219488172">Позвонить</a>
              <a class="btn btn--white" href="/contact.html">Оставить заявку</a>
            </div>
          </div>
          <div class="hero__image-wrap">
            <div class="hero__image-box">
              <img src="${relPath}assets/images/webp/hero-800x480/default-service.webp" alt="${title}" width="800" height="480" fetchpriority="high" decoding="async" class="grayscale" />
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return buildPage({
    pagePath,
    title: `${title} | zamok-i`,
    description: `${description} — профессиональные услуги в Санкт-Петербурге.`,
    sectionName,
    heroHtml,
  });
}

/**
 * Синхронизация страниц услуг
 */
function syncServicesPages() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error("services-data.json должен быть массивом");
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of data) {
    if (!item || !item.pagePath || !item.title) continue;

    const fullPath = path.join(ROOT, item.pagePath);
    const exists = fs.existsSync(fullPath);

    // Пропускаем существующие файлы (чтобы не затереть ручные правки)
    // В продакшене можно убрать эту проверку
    if (exists) {
      continue;
    }

    ensureDir(fullPath);
    const html = buildServicePage(item);
    fs.writeFileSync(fullPath, html, "utf8");

    if (exists) {
      updatedCount += 1;
    } else {
      createdCount += 1;
      console.log(`✓ создано: ${item.pagePath}`);
    }
  }

  console.log(`\n📊 Итоги синхронизации:`);
  console.log(`   создано: ${createdCount}`);
  console.log(`   обновлено: ${updatedCount}`);
}

/**
 * Создание директории для файла
 */
function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Сборка всех страниц из templates
 */
function buildAll() {
  console.log("🚀 Начало сборки...\n");

  // Очищаем кэш шаблонов
  clearTemplatesCache();

  // Проверяем наличие шаблонов
  const templates = loadTemplates();
  if (!templates.header || !templates.footer) {
    console.error("❌ Ошибка: не найдены шаблоны header.html или footer.html");
    console.error(`   Проверьте папку: ${INCLUDES_DIR}`);
    process.exit(1);
  }

  console.log("✅ Шаблоны загружены:");
  console.log(`   header.html: ${templates.header.length} байт`);
  console.log(`   footer.html: ${templates.footer.length} байт`);
  console.log(`   секций: ${Object.keys(templates.sections).length}`);

  // Синхронизируем страницы услуг
  syncServicesPages();

  console.log("\n✅ Сборка завершена!");
}

/**
 * Watch mode
 */
function runWatch() {
  console.log("👁️  Watch mode включён...\n");

  const watchPaths = [
    INCLUDES_DIR,
    DATA_PATH,
    path.join(ROOT, "includes/sections"),
  ];

  for (const watchPath of watchPaths) {
    if (!fs.existsSync(watchPath)) continue;

    fs.watch(watchPath, (eventType) => {
      console.log(`\n📡 Изменения в ${watchPath}`);
      clearTemplatesCache();
      buildAll();
    });
  }

  console.log(`Следим за изменениями в:`);
  watchPaths.forEach((p) => console.log(`   - ${p}`));
}

/**
 * Главная функция
 */
function main() {
  try {
    if (WATCH_MODE) {
      runWatch();
    } else {
      buildAll();
    }
  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
    process.exit(1);
  }
}

main();
