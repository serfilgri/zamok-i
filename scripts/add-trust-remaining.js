#!/usr/bin/env node
/**
 * add-trust-remaining.js
 * Добавляет блоки доверия на страницы с id="contact" (не class="contact")
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INC  = path.join(ROOT, 'includes/sections');

const reviews  = fs.readFileSync(path.join(INC, 'reviews.html'),   'utf8').trimEnd();
const masters  = fs.readFileSync(path.join(INC, 'masters.html'),   'utf8').trimEnd();
const documents= fs.readFileSync(path.join(INC, 'documents.html'), 'utf8').trimEnd();

const INSERT_BLOCK = `\n${reviews}\n\n${masters}\n\n${documents}\n\n`;

// Страницы у которых anchor — cta-banner или section с id=contact
const targets = [
  'service/zamena/skolko-stoit-zamenit-zamok.html',
  'service/zamena/srochnaya-zamena-zamka-v-den-obrashcheniya.html',
  'service/zamena/zamena-zamka-bez-povrezhdeniya-dveri.html',
  'service/zamena/zamena-zamka-i-ustanovka-novogo.html',
  'service/zamena/zamena-zamka-pri-potere-klyuchey.html',
  'service/zamena/zamena-zamka-s-garantiey.html',
  'service/zamena/zamena-zamka-s-vyezdom-15-minut.html',
  'service/zamena/zamena-zamka-v-chastnom-dome.html',
  'service/zamena/zamena-zamka-v-metallicheskoy-dveri.html',
  'service/zamena/zamena-zamka-v-ofise.html',
];

let count = 0;

for (const rel of targets) {
  const file = path.join(ROOT, rel);

  if (!fs.existsSync(file)) {
    console.warn(`  ⚠ файл не найден: ${rel}`);
    continue;
  }

  let src = fs.readFileSync(file, 'utf8');

  if (src.includes('class="reviews"') || src.includes('class="masters"')) {
    console.log(`  — уже есть: ${rel}`);
    continue;
  }

  // Ищем возможные якоря
  let anchor = null;
  if (src.includes('<section class="contact"'))          anchor = '<section class="contact"';
  else if (src.includes('<section class="cta-banner"'))  anchor = '<section class="cta-banner"';
  else if (src.includes('id="contact"'))                 anchor = `id="contact"`;
  else if (src.includes('<footer'))                      anchor = '<footer';

  if (!anchor) {
    console.warn(`  ⚠ якорь не найден: ${rel}`);
    continue;
  }

  const newSrc = src.replace(anchor, `${INSERT_BLOCK}    ${anchor}`);
  fs.writeFileSync(file, newSrc, 'utf8');
  count++;
  console.log(`  ✓ ${rel}`);
}

console.log(`\n✅ Добавлено: ${count} страниц`);
