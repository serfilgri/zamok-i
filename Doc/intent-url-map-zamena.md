# Intent to URL Map: service/zamena

Дата фиксации: 2026-02-28

## Основное правило
- Один поисковый интент = один целевой URL.
- Если страница отвечает за другой интент, ставим внутреннюю ссылку на правильный URL, а не дублируем контент.

## Карта интентов
| Интент / группа запросов | Целевой URL | Что НЕ таргетировать на странице |
|---|---|---|
| замена замков спб, поменять замок спб (кластерный обзор) | `/service/zamena/zamena-zamkov-spb.html` | Узкие интенты: цилиндровый, сувальдный, ночной, после взлома |
| замена замка входной двери спб | `/service/zamena/zamena-zamka-vhodnoy-dveri.html` | Общий кластер `замена замков спб` |
| замена дверных замков спб (комплексная замена по типам дверей) | `/service/zamena/zamena-dvernyh-zamkov.html` | Интент "входная дверь" как основной |
| замена замка в двери квартиры | `/service/zamena/zamena-zamka-dveri.html` | Интент "после взлома" и "ночная замена" |
| замена цилиндрового замка | `/service/zamena/zamena-cilindrovogo-zamka.html` | Интент "сувальдный" как основной |
| замена сувальдного замка | `/service/zamena/zamena-suvaldnogo-zamka.html` | Интент "цилиндровый" как основной |
| замена замка после взлома | `/service/zamena/zamena-zamka-posle-vzloma.html` | Общий интент без аварийного контекста |
| ночная замена замка, замена замка ночью | `/service/zamena/nochnaya-zamena-zamka.html` | Дневной общий интент как основной |

## Технические требования для каждой страницы
- Уникальный `title` и один `H1` под свой интент.
- `canonical` на себя.
- Уникальные `og:title`, `og:url`, `og:image` (желательно отличать и hero-изображения).
- `Service` + `FAQPage` + `BreadcrumbList` в JSON-LD без HTML внутри `text`.
- В блоке "Смотрите также" ссылки только на соседние интенты без самоссылки.

## Правила при добавлении новой страницы
1. Проверить, нет ли уже страницы с тем же интентом в этой таблице.
2. Если интент новый, добавить строку в таблицу и сразу завести URL в `sitemap.xml`.
3. Добавить минимум 2 внутренних ссылки:
- из кластерной страницы `/service/zamena/zamena-zamkov-spb.html`
- из одной соседней узкой страницы.
4. Проверить отсутствие дублей `title` по папке `service/zamena`.

## Быстрая команда самопроверки
```bash
node -e "const fs=require('fs');const files=fs.readdirSync('service/zamena').filter(f=>f.endsWith('.html')).map(f=>'service/zamena/'+f);const m=new Map();for(const f of files){const h=fs.readFileSync(f,'utf8');const t=(h.match(/<title>[\\s\\S]*?<\\/title>/)||[''])[0].replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim();if(!m.has(t))m.set(t,[]);m.get(t).push(f);}for(const [t,a] of m){if(a.length>1){console.log('DUP TITLE:',t);a.forEach(x=>console.log(' -',x));}}"
```
