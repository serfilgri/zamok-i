#!/usr/bin/env node
/**
 * add-trust-sections.js
 *
 * Вставляет три блока доверия в сервисные страницы перед секцией contact:
 *   1. reviews    — отзывы клиентов
 *   2. masters    — наши мастера
 *   3. documents  — документы при вызове
 *
 * Обрабатываем все страницы в /service кроме:
 *   - prigorody/  — там другая структура (нет .contact-секции)
 *   - raiony/     — добавим только к "полным" страницам (> 20 KB)
 *
 * Блоки НЕ добавляются если уже есть class="reviews" или class="masters".
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const SERVICE = path.join(ROOT, 'service');
const INC     = path.join(ROOT, 'includes/sections');

// Читаем инклюды
const reviews  = fs.readFileSync(path.join(INC, 'reviews.html'),   'utf8').trimEnd();
const masters  = fs.readFileSync(path.join(INC, 'masters.html'),   'utf8').trimEnd();
const documents= fs.readFileSync(path.join(INC, 'documents.html'), 'utf8').trimEnd();

const INSERT_BLOCK = `\n${reviews}\n\n${masters}\n\n${documents}\n\n`;
const ANCHOR = '<section class="contact"';

// Рекурсивный обход
function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const htmlFiles = walk(SERVICE);
let count = 0;
let skipped = 0;

for (const file of htmlFiles) {
  const rel  = path.relative(SERVICE, file).replace(/\\/g, '/');
  const size = fs.statSync(file).size;

  // Пропускаем пригородные (маленькие, нет полного шаблона с contact)
  if (rel.startsWith('prigorody/')) {
    continue;
  }

  // Для районных — только "полные" страницы (> 20 KB)
  if (rel.startsWith('raiony/') && size < 20000) {
    console.log(`  — пропуск (тонкая районная < 20KB): ${rel}`);
    skipped++;
    continue;
  }

  const src = fs.readFileSync(file, 'utf8');

  // Пропускаем если блоки уже есть
  if (src.includes('class="reviews"') || src.includes('class="masters"')) {
    console.log(`  — уже есть: ${rel}`);
    skipped++;
    continue;
  }

  // Проверяем что anchor есть
  if (!src.includes(ANCHOR)) {
    console.warn(`  ⚠ не найден якорь contact: ${rel}`);
    skipped++;
    continue;
  }

  const newSrc = src.replace(ANCHOR, `${INSERT_BLOCK}    ${ANCHOR}`);
  fs.writeFileSync(file, newSrc, 'utf8');
  count++;
  console.log(`  ✓ ${rel}  (${Math.round(size/1024)}KB)`);
}

console.log(`\n✅ Блоки доверия добавлены: ${count} страниц, пропущено: ${skipped}`);
