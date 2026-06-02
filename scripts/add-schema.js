#!/usr/bin/env node
/**
 * add-schema.js
 *
 * Добавляет Schema.org (Service + FAQPage + BreadcrumbList) на все страницы
 * в /service которые ещё не имеют ld+json разметки.
 *
 * Данные (title, description, canonical, H1) извлекаются прямо из каждого файла.
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const SERVICE = path.join(ROOT, 'service');

// ── Хелперы ──────────────────────────────────────────────────────────────────

function extractMeta(html) {
  const title    = (html.match(/<title>([^<]+)<\/title>/)                    || [])[1] || '';
  const desc     = (html.match(/<meta name="description"\s+content="([^"]+)"/) || [])[1] || '';
  const canonical= (html.match(/<link rel="canonical"\s+href="([^"]+)"/)      || [])[1] || '';
  // H1 — убираем теги внутри
  const h1raw    = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)                  || [])[1] || title;
  const h1       = h1raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return { title, desc, canonical, h1 };
}

// Определяем тип страницы по пути
function getPageType(filePath) {
  const rel = path.relative(SERVICE, filePath).replace(/\\/g, '/');
  if (rel.includes('prigorody/')) return 'prigorod';
  if (rel.includes('raiony/'))    return 'rayon';
  return 'commercial';
}

// Извлекаем имя локации из пути (для breadcrumbs и serviceType)
function getLocation(filePath, type) {
  const base = path.basename(filePath, '.html');
  if (type === 'prigorod') {
    // zamena-zamka-petergof → Петергоф
    return ucFirst(base.replace('zamena-zamka-', '').replace(/-/g, ' '));
  }
  if (type === 'rayon') {
    // zamena-zamka-admiralteyskiy-rayon → Адмиралтейском районе
    return ucFirst(base.replace('zamena-zamka-', '').replace(/-rayon$/, '').replace(/-/g, ' ')) + ' районе СПб';
  }
  return 'Санкт-Петербурге';
}

function ucFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// FAQ — стандартные для замены замков
function buildFAQ(location, type) {
  if (type === 'prigorod') {
    return [
      { q: `Как быстро приедет мастер в ${location}?`,
        a: `Среднее время выезда в ${location} — 45–55 минут. Работаем ежедневно с 08:00 до 22:00.` },
      { q: 'Нужно ли покупать замок заранее?',
        a: 'Нет, мастер приезжает с набором замков разных классов защиты. Вы выбираете на месте.' },
      { q: 'Дадут ли гарантию на замену замка?',
        a: 'Да, выдаём гарантийный талон на работу и установленный замок сроком до 12 месяцев.' },
    ];
  }
  // rayon и commercial
  return [
    { q: `Сколько стоит замена замка в ${location}?`,
      a: `Замена личинки — от 1 500 ₽, сувальдного замка — от 2 000 ₽. Точная цена после осмотра.` },
    { q: 'Можно ли заменить только личинку?',
      a: 'Да, если корпус исправен. Это дешевле полной замены. Мастер определит оптимальный вариант на месте.' },
    { q: 'Как быстро приедет мастер?',
      a: 'По Санкт-Петербургу — в среднем 30 минут. Работаем ежедневно с 08:00 до 22:00.' },
  ];
}

// Строим breadcrumbs
function buildBreadcrumbs(canonical, h1, type) {
  const base = [
    { pos: 1, name: 'Главная',  item: 'https://zamok-i.ru/' },
    { pos: 2, name: 'Услуги',   item: 'https://zamok-i.ru/services.html' },
    { pos: 3, name: 'Замена замка', item: 'https://zamok-i.ru/service/zamena/zamena-zamka-dveri.html' },
  ];
  if (type === 'rayon') {
    base.push({ pos: 4, name: h1, item: canonical });
  } else if (type === 'prigorod') {
    base.splice(3, 1); // убираем "Замена замка" — ставим прямую цепочку
    base.push(
      { pos: 3, name: 'Замена замка', item: 'https://zamok-i.ru/service/zamena/zamena-zamka-dveri.html' },
      { pos: 4, name: 'Пригороды СПб', item: 'https://zamok-i.ru/service/zamena/zamena-zamka-prigorody-spb.html' },
      { pos: 5, name: h1, item: canonical },
    );
  } else {
    base.push({ pos: 4, name: h1, item: canonical });
  }
  return base;
}

// Собираем итоговый JSON-LD блок
function buildSchema(meta, type, location) {
  const { title, desc, canonical, h1 } = meta;
  const faqItems = buildFAQ(location, type);
  const breadcrumbs = buildBreadcrumbs(canonical, h1, type);

  const graph = [
    {
      "@type": "LocalBusiness",
      "@id": "https://zamok-i.ru/#organization",
      "name": "zamok-i",
      "url": "https://zamok-i.ru/",
      "telephone": "+7-921-948-81-72",
      "email": "info@zamok-i.ru",
      "areaServed": ["Санкт-Петербург", "Ленинградская область"],
      "openingHours": "Mo-Su 08:00-22:00"
    },
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      "name": h1,
      "serviceType": "Замена замка",
      "url": canonical,
      "description": desc,
      "areaServed": ["Санкт-Петербург", "Ленинградская область"],
      "provider": { "@id": "https://zamok-i.ru/#organization" },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "RUB",
        "price": "1500"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": faqItems.map(({ q, a }) => ({
        "@type": "Question",
        "name": q,
        "acceptedAnswer": { "@type": "Answer", "text": a }
      }))
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map(({ pos, name, item }) => ({
        "@type": "ListItem",
        "position": pos,
        "name": name,
        "item": item
      }))
    }
  ];

  return `    <script type="application/ld+json">\n      ${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/\n/g, '\n      ')}\n    </script>`;
}

// ── Рекурсивный обход ─────────────────────────────────────────────────────────

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

for (const file of htmlFiles) {
  let src = fs.readFileSync(file, 'utf8');

  // Пропускаем уже размеченные
  if (src.includes('application/ld+json')) continue;

  const type     = getPageType(file);
  const meta     = extractMeta(src);
  const location = getLocation(file, type);
  const schema   = buildSchema(meta, type, location);

  // Вставляем Schema.org перед закрывающим </body>  (или перед main.js)
  const insertBefore = src.includes('</body>') ? '</body>' : '</html>';
  const newSrc = src.replace(insertBefore, `\n${schema}\n  ${insertBefore}`);

  fs.writeFileSync(file, newSrc, 'utf8');
  count++;
  console.log(`  ✓ ${path.relative(ROOT, file)} [${type}]`);
}

console.log(`\n✅ Schema.org добавлена на ${count} страниц`);
