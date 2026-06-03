#!/usr/bin/env node
/**
 * add-brands.js
 * Добавляет блок брендов замков на основные коммерческие страницы
 * (не районные и не пригородные — там слишком мало места).
 * Вставляем после секции work-stages, или перед pricing-table#price.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INC  = path.join(ROOT, 'includes/sections');
const brands = fs.readFileSync(path.join(INC, 'brands.html'), 'utf8').trimEnd();

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const SERVICE = path.join(ROOT, 'service');
const files = walk(SERVICE);
let count = 0;

for (const file of files) {
  const rel = path.relative(SERVICE, file).replace(/\\/g, '/');

  // Только основные коммерческие — не районные и не пригородные
  if (rel.startsWith('raiony/') || rel.startsWith('prigorody/') || rel.startsWith('zamena/raiony') || rel.startsWith('zamena/prigorody')) {
    continue;
  }

  const src = fs.readFileSync(file, 'utf8');

  // Пропускаем если уже есть
  if (src.includes('class="brands"')) continue;

  // Якорь: после id="work-stages", иначе перед id="price"
  let anchor = null;
  let replace = '';

  if (src.includes('id="work-stages"')) {
    // Найдём закрывающий </section> после work-stages
    const idx = src.indexOf('id="work-stages"');
    // Ищем следующий </section> после него
    const closeIdx = src.indexOf('</section>', idx);
    if (closeIdx !== -1) {
      anchor = src.slice(closeIdx, closeIdx + 10); // "</section>"
      replace = `</section>\n\n${brands}\n`;
      // Нам нужна только первая замена — используем split/join
      const parts = src.split(anchor);
      if (parts.length >= 2) {
        const newSrc = parts[0] + replace + parts.slice(1).join(anchor);
        fs.writeFileSync(file, newSrc, 'utf8');
        count++;
        console.log(`  ✓ ${rel}`);
        continue;
      }
    }
  }

  // Запасной вариант — перед pricing-table#price
  if (src.includes('id="price"')) {
    const anchor2 = '<section class="pricing-table" id="price"';
    if (src.includes(anchor2)) {
      const newSrc = src.replace(anchor2, `${brands}\n\n    ${anchor2}`);
      fs.writeFileSync(file, newSrc, 'utf8');
      count++;
      console.log(`  ✓ ${rel} (via price anchor)`);
    }
  }
}

console.log(`\n✅ Бренды добавлены: ${count} страниц`);
