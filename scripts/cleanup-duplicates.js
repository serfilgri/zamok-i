const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

// Файлы, из которых нужно удалить дублирующуюся секцию
const FILES_TO_CLEAN = [
  "about.html",
  "contact.html",
  "pricing.html",
  "process.html",
  "faq.html",
  "policy.html",
  "offer.html",
];

// Паттерн для поиска секции "Что важно знать"
const SECTION_PATTERN = /[\s\n]*<section class="services">[\s\n]*<div class="container">[\s\n]*<div class="services__head">[\s\S]*?<h2 class="section-title">Что важно знать[\s\S]*?<\/section>[\s\n]*/;

// Паттерн для поиска секции с class="services" и grid-template-columns: 1fr
const SECTION_ALT_PATTERN = /[\s\n]*<section class="services">[\s\n]*<div class="container">[\s\n]*<div class="services__grid" style="grid-template-columns: 1fr">[\s\S]*?<\/section>[\s\n]*/;

/**
 * Удаление дублирующейся секции из файла
 */
function removeDuplicateSection(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const originalLength = content.length;

  // Пробуем удалить основную секцию
  let newContent = content.replace(SECTION_PATTERN, "");

  // Если не найдено, пробуем альтернативный паттерн
  if (newContent.length === originalLength) {
    newContent = content.replace(SECTION_ALT_PATTERN, "");
  }

  if (newContent.length === originalLength) {
    console.log(`⊘ пропущено: ${path.relative(ROOT, filePath)} (секция не найдена)`);
    return false;
  }

  fs.writeFileSync(filePath, newContent, "utf8");
  const removed = originalLength - newContent.length;
  console.log(`✓ удалено: ${path.relative(ROOT, filePath)} (-${removed} байт)`);
  return true;
}

/**
 * Обновление навигации в файле
 */
function updateNavigation(filePath) {
  const headerPath = path.join(ROOT, "includes", "header.html");
  if (!fs.existsSync(headerPath)) return false;

  const headerContent = fs.readFileSync(headerPath, "utf8");
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Паттерн для поиска navbar
  const navPattern = /[\s\n]*<nav class="navbar" id="navbar">[\s\S]*?<\/nav>[\s\n]*/;

  if (!navPattern.test(fileContent)) {
    console.log(`⊘ навигация не найдена: ${path.relative(ROOT, filePath)}`);
    return false;
  }

  const newContent = fileContent.replace(navPattern, `\n${headerContent}\n`);
  fs.writeFileSync(filePath, newContent, "utf8");
  console.log(`✎ обновлено: ${path.relative(ROOT, filePath)} (навигация)`);
  return true;
}

/**
 * Обновление подвала в файле
 */
function updateFooter(filePath) {
  const footerPath = path.join(ROOT, "includes", "footer.html");
  if (!fs.existsSync(footerPath)) return false;

  const footerContent = fs.readFileSync(footerPath, "utf8");
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Паттерн для поиска footer
  const footerPattern = /[\s\n]*<footer class="footer">[\s\S]*?<\/footer>[\s\n]*[\s\n]*<button class="scroll-top"[\s\S]*?<\/button>[\s\n]*/;

  if (!footerPattern.test(fileContent)) {
    console.log(`⊘ подвал не найден: ${path.relative(ROOT, filePath)}`);
    return false;
  }

  const newContent = fileContent.replace(footerPattern, `\n${footerContent}\n`);
  fs.writeFileSync(filePath, newContent, "utf8");
  console.log(`✎ обновлено: ${path.relative(ROOT, filePath)} (подвал)`);
  return true;
}

/**
 * Основная функция
 */
function main() {
  console.log("🧹 Очистка дублирующегося контента\n");

  let removedCount = 0;
  let updatedNav = 0;
  let updatedFooter = 0;

  // Удаляем дубли секций
  for (const fileName of FILES_TO_CLEAN) {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⊘ не найдено: ${fileName}`);
      continue;
    }

    if (removeDuplicateSection(filePath)) {
      removedCount += 1;
    }
  }

  console.log("\n🔄 Обновление навигации и подвала...\n");

  // Обновляем навигацию и подвал во всех HTML файлах
  const allHtmlFiles = getAllHtmlFiles(ROOT);

  for (const filePath of allHtmlFiles) {
    // Пропускаем файлы в includes/
    if (filePath.includes("/includes/")) continue;

    if (updateNavigation(filePath)) updatedNav += 1;
    if (updateFooter(filePath)) updatedFooter += 1;
  }

  console.log("\n📊 Итоги:");
  console.log(`   удалено секций: ${removedCount}`);
  console.log(`   обновлено навигации: ${updatedNav}`);
  console.log(`   обновлено подвалов: ${updatedFooter}`);
  console.log("\n✅ Очистка завершена!");
}

/**
 * Получение всех HTML файлов
 */
function getAllHtmlFiles(dirPath, out = []) {
  const skipDirs = new Set(["node_modules", ".git", "_pgbackup", "includes"]);

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        getAllHtmlFiles(fullPath, out);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(fullPath);
      }
    }
  } catch (e) {
    // Игнорируем ошибки доступа
  }

  return out;
}

main();
