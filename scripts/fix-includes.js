#!/usr/bin/env node
/**
 * fix-includes.js
 * 
 * 1. Раскрывает @@include-комментарии в service/*.html
 * 2. Исправляет артефакт «Четкая граница интента» в remont-zamkov-dvernyh.html
 * 3. Исправляет тег «SEO и полезная информация» в том же файле
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const SERVICE = path.join(ROOT, 'service');

// ── 1. Загружаем содержимое инклюдов ─────────────────────────────────────────

const INCLUDES = {
  "includes/sections/benefits.html":    fs.readFileSync(path.join(ROOT, 'includes/sections/benefits.html'),    'utf8').trimEnd(),
  "includes/sections/work-stages.html": fs.readFileSync(path.join(ROOT, 'includes/sections/work-stages.html'), 'utf8').trimEnd(),
  "includes/sections/faq-extended.html":fs.readFileSync(path.join(ROOT, 'includes/sections/faq-extended.html'),'utf8').trimEnd(),
};

// Регулярка для поиска: <!-- @@include 'путь' -->  (с пробелами любыми)
const INCLUDE_RE = /<!--\s*@@include\s+'([^']+)'\s*-->/g;

// ── 2. Собираем все html-файлы в /service рекурсивно ────────────────────────

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
let totalFixed  = 0;
let totalFiles  = 0;

// ── 3. Раскрываем инклюды ────────────────────────────────────────────────────

for (const file of htmlFiles) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  const result = src.replace(INCLUDE_RE, (match, includePath) => {
    if (INCLUDES[includePath]) {
      changed = true;
      totalFixed++;
      console.log(`  ✓ ${path.relative(ROOT, file)} ← ${includePath}`);
      return INCLUDES[includePath];
    }
    // Инклюд есть в коде, но файла нет — оставляем как есть, предупреждаем
    console.warn(`  ⚠ Инклюд не найден: ${includePath} в ${path.relative(ROOT, file)}`);
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, result, 'utf8');
    totalFiles++;
  }
}

console.log(`\n✅ Инклюды: раскрыто ${totalFixed} вхождений в ${totalFiles} файлах\n`);

// ── 4. Исправляем артефакт в remont-zamkov-dvernyh.html ─────────────────────

const remontFile = path.join(SERVICE, 'remont/remont-zamkov-dvernyh.html');
let remont = fs.readFileSync(remontFile, 'utf8');
let remontChanged = false;

// 4a. Карточка «Четкая граница интента» — заменяем на нормальный текст
const BAD_CARD = `          <article class="service-card">
            <span class="service-card__num">01</span>
            <h3>Четкая граница интента</h3>
            <p>
              Эта страница про общий ремонт дверных замков. Узкий интент по
              входным дверям вынесен отдельно на страницу
              <a href="/service/remont/remont-zamkov-dvernyh.html">ремонт замка входной двери</a>.
            </p>
          </article>`;

const GOOD_CARD = `          <article class="service-card">
            <span class="service-card__num">01</span>
            <h3>Диагностика до начала работ</h3>
            <p>
              Перед ремонтом мастер осматривает замок, определяет причину
              неисправности и озвучивает точную стоимость. Приступаем только
              после вашего согласия.
            </p>
          </article>`;

if (remont.includes(BAD_CARD)) {
  remont = remont.replace(BAD_CARD, GOOD_CARD);
  remontChanged = true;
  console.log('  ✓ Исправлена карточка «Четкая граница интента»');
} else {
  console.warn('  ⚠ Карточка «Четкая граница интента» не найдена (возможно, уже исправлена)');
}

// 4b. Тег «SEO и полезная информация» — заменяем на нормальный
const BAD_TAG  = `<div class="tag" style="margin-bottom: 16px">SEO и полезная информация</div>`;
const GOOD_TAG = `<div class="tag" style="margin-bottom: 16px">Полезная информация</div>`;

if (remont.includes(BAD_TAG)) {
  remont = remont.replace(BAD_TAG, GOOD_TAG);
  remontChanged = true;
  console.log('  ✓ Исправлен тег «SEO и полезная информация»');
} else {
  console.warn('  ⚠ Тег «SEO и полезная информация» не найден (возможно, уже исправлен)');
}

if (remontChanged) {
  fs.writeFileSync(remontFile, remont, 'utf8');
  console.log('✅ remont-zamkov-dvernyh.html сохранён\n');
}

console.log('🎉 Всё готово!');
