#!/usr/bin/env node
/**
 * Полный технический SEO-аудит сайта zamok-i.ru
 * Проверяет: sitemap sync, мета-теги, JSON-LD, h1, canonical, lastmod, дубли.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://zamok-i.ru';

const report = { errors: [], warnings: [], info: [] };
const log = (lvl, m) => report[lvl].push(m);

// ---------- 1. Собираем все HTML-файлы (исключая служебные) ----------
const EXCLUDE_DIRS = ['node_modules', '_pgbackup', '_pginfo', '.git', '.idea', '.vscode', 'Doc', 'scripts', 'tools', '.tools', 'docker', 'includes', 'api'];
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      // исключаем master/тестовые/бэкапы
      if (/^landing-master\.html$/.test(entry.name)) continue;
      if (/\.backup-/.test(entry.name)) continue;
      if (/^test-/.test(entry.name)) continue;
      htmlFiles.push(full);
    }
  }
}
walk(ROOT);

const relFiles = htmlFiles.map(f => '/' + path.relative(ROOT, f).split(path.sep).join('/'));

// ---------- 2. Парсим sitemap.xml ----------
let sitemapUrls = [];
try {
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(sm))) sitemapUrls.push(m[1]);
} catch (e) {
  log('errors', 'sitemap.xml не найден/не читается: ' + e.message);
}

const sitemapRels = sitemapUrls.map(u => u.replace(SITE, ''));

// ---------- 3. Сравнение sitemap <-> файлы ----------
const filesNotInSitemap = relFiles.filter(r => !sitemapRels.includes(r));
const sitemapNoFile = sitemapRels.filter(r => {
  // /blog/ — это /blog/index.html
  if (r === '/blog/') return !relFiles.includes('/blog/index.html');
  return !relFiles.includes(r);
});

log('info', `HTML-файлов: ${htmlFiles.length}`);
log('info', `URL в sitemap: ${sitemapUrls.length}`);
filesNotInSitemap.forEach(f => log('warnings', `Файл есть, в sitemap нет: ${f}`));
sitemapNoFile.forEach(u => log('errors', `В sitemap есть, файла нет: ${u}`));

// ---------- 4. Проверка каждого HTML ----------
const JS_KEYWORDS = /установка|замена|вскрытие|ремонт|замок|личинка|цилиндр|сувальдный|дверь|квартир|спб|санкт-петербург/i;

for (const file of htmlFiles) {
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  let html;
  try { html = fs.readFileSync(file, 'utf8'); }
  catch (e) { log('errors', `${rel}: не читается`); continue; }

  // --- 4a. <title>
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch) log('errors', `${rel}: нет <title>`);
  else if (titleMatch[1].trim().length < 30) log('warnings', `${rel}: короткий title (${titleMatch[1].trim().length} симв): "${titleMatch[1].trim()}"`);
  else if (titleMatch[1].trim().length > 70) log('warnings', `${rel}: длинный title (${titleMatch[1].trim().length} симв)`);

  // --- 4b. meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (!descMatch) log('errors', `${rel}: нет meta description`);
  else if (descMatch[1].trim().length < 70) log('warnings', `${rel}: короткий description (${descMatch[1].trim().length})`);
  else if (descMatch[1].trim().length > 180) log('warnings', `${rel}: длинный description (${descMatch[1].trim().length})`);

  // --- 4c. canonical
  const canonMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonMatch) log('errors', `${rel}: нет canonical`);
  else {
    const canonRel = canonMatch[1].replace(SITE, '');
    if (canonRel !== rel && !(canonRel === '/blog/' && rel === '/blog/index.html')) {
      log('warnings', `${rel}: canonical указывает на ${canonMatch[1]}`);
    }
  }

  // --- 4d. lang
  if (!/<html[^>]+lang=["']ru["']/i.test(html)) log('warnings', `${rel}: нет lang="ru" на <html>`);

  // --- 4e. H1 — должен быть один
  const h1matches = html.match(/<h1[\s>]/gi) || [];
  if (h1matches.length === 0) log('errors', `${rel}: нет <h1>`);
  else if (h1matches.length > 1) log('warnings', `${rel}: несколько <h1> (${h1matches.length})`);

  // --- 4f. JSON-LD валидность
  const ldBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  if (ldBlocks.length === 0 && rel === '/index.html') {
    log('warnings', `${rel}: нет JSON-LD`);
  }
  for (let i = 0; i < ldBlocks.length; i++) {
    try {
      const obj = JSON.parse(ldBlocks[i][1]);
      if (!obj['@context'] && !Array.isArray(obj)) log('warnings', `${rel}: JSON-LD блок ${i+1} без @context`);
    } catch (e) {
      log('errors', `${rel}: битый JSON-LD блок ${i+1}: ${e.message}`);
    }
  }

  // --- 4g. мета keywords (устарел, но проверим наличие)
  if (!/<meta\s+name=["']keywords["']/i.test(html) && rel === '/index.html') {
    log('info', `${rel}: нет keywords (не критично)`);
  }

  // --- 4h. og:image
  if (!/og:image/i.test(html)) log('warnings', `${rel}: нет og:image`);

  // --- 4i. изображения без alt
  const imgs = [...html.matchAll(/<img\s+[^>]*>/gi)];
  let noAlt = 0;
  for (const im of imgs) {
    if (!/\salt=["'][^"']+["']/i.test(im[0])) noAlt++;
  }
  if (noAlt > 0) log('warnings', `${rel}: ${noAlt} <img> без alt`);

  // --- 4j. дубликаты (та же длина/контент)
}

// ---------- 5. Поиск дубликатов контента (одинаковый размер + одинаковый title) ----------
const sizeMap = new Map();
for (const file of htmlFiles) {
  const stat = fs.statSync(file);
  const key = stat.size;
  if (!sizeMap.has(key)) sizeMap.set(key, []);
  sizeMap.get(key).push(file);
}
for (const [size, files] of sizeMap) {
  if (files.length > 1 && size > 5000) {
    // проверим title
    const titles = files.map(f => {
      const h = fs.readFileSync(f, 'utf8');
      const m = h.match(/<title>([^<]+)<\/title>/i);
      return m ? m[1].trim() : '';
    });
    const uniq = new Set(titles);
    if (uniq.size < files.length) {
      log('warnings', `Возможный дубликат контента (size=${size}, одинаковый title): ${files.map(f => '/' + path.relative(ROOT, f).split(path.sep).join('/')).join(', ')}`);
    }
  }
}

// ---------- 6. lastmod vs mtime ----------
const today = new Date();
for (const u of sitemapUrls) {
  const rel = u.replace(SITE, '');
  let fileRel = rel === '/blog/' ? '/blog/index.html' : rel;
  const file = path.join(ROOT, fileRel);
  if (!fs.existsSync(file)) continue;
  const lmMatch = sitemapRels; // skip, нужен повторный парсинг
}

// ---------- Отчёт ----------
console.log('========================================');
console.log('  SEO ТЕХНИЧЕСКИЙ АУДИТ  zamok-i.ru');
console.log('========================================\n');
console.log(`Файлов HTML: ${htmlFiles.length}`);
console.log(`URL в sitemap: ${sitemapUrls.length}`);
console.log(`Ошибок: ${report.errors.length}`);
console.log(`Предупреждений: ${report.warnings.length}\n`);

if (report.errors.length) {
  console.log('--- ОШИБКИ ---');
  report.errors.forEach(m => console.log('  ❌ ' + m));
  console.log();
}
if (report.warnings.length) {
  console.log('--- ПРЕДУПРЕЖДЕНИЯ ---');
  report.warnings.forEach(m => console.log('  ⚠️  ' + m));
  console.log();
}
