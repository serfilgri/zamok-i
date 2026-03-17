# План консолидации дублирующихся страниц (SEO)

## Проблема
Google не индексирует страницы из-за каннибализации ключевых слов — множество страниц с похожим интентом.

## Текущие дубли (кластер "Замена замков")

### Кластер 1: Замена замков (основной)
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/zamena/zamena-zamka-dveri.html` | **ОСТАВИТЬ** (основная) | Canonical для всех дублей |
| `/service/zamena/zamena-zamka-vhodnoy-dveri.html` | Удалить | 301 → zamena-zamka-dveri.html |
| `/service/zamena/zamena-dvernyh-zamkov.html` | Удалить | 301 → zamena-zamka-dveri.html |
| `/service/zamena/zamena-zamkov-spb.html` | Удалить | 301 → zamena-zamka-dveri.html |

### Кластер 2: Замена цилиндровых замков
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/zamena/zamena-cilindrovogo-zamka.html` | **ОСТАВИТЬ** | Уникальный контент |
| `/service/zamena/zamena-suvaldnogo-zamka.html` | **ОСТАВИТЬ** | Уникальный контент |

### Кластер 3: Вскрытие замков
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/vskrytie/avariynoe-vskrytie-zamkov.html` | **ОСТАВИТЬ** (основная) | Canonical |
| `/service/vskrytie/vskrytie-zamkov-kvartire.html` | Удалить | 301 → avariynoe-vskrytie-zamkov.html |
| `/service/vskrytie/vskrytie-zamkov-mashiny.html` | **ОСТАВИТЬ** | Уникальный интент (авто) |
| `/service/vyzvat-mastera-vskrytiyu.html` | Удалить | 301 → avariynoe-vskrytie-zamkov.html |

### Кластер 4: Ремонт замков
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/remont/remont-zamkov-dvernyh.html` | **ОСТАВИТЬ** (основная) | Canonical |
| `/service/remont/remont-zamka-vhodnoy.html` | Удалить | 301 → remont-zamkov-dvernyh.html |
| `/service/remont/masterskaya-remontu-zamkov.html` | Удалить | 301 → remont-zamkov-dvernyh.html |

### Кластер 5: Установка замков
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/ustanovka/ustanovka-zamkov-zamkov.html` | **ОСТАВИТЬ** | Уникальный контент |
| `/service/ustanovka/ustanovka-zamka-mezhkomnatnuyu.html` | **ОСТАВИТЬ** | Уникальный интент |
| `/service/ustanovka/vrezka-zamka-mezhkomnatnuyu.html` | **ОСТАВИТЬ** | Уникальный интент |
| `/service/ustanovka/ustanovka-dvernyh-ruchek.html` | **ОСТАВИТЬ** | Уникальный интент |

### Кластер 6: Прочее
| Страница | Статус | Решение |
|----------|--------|---------|
| `/service/zamena/nochnaya-zamena-zamka.html` | **ОСТАВИТЬ** | Уникальный интент (ночь) |
| `/service/zamena/zamena-zamka-posle-vzloma.html` | **ОСТАВИТЬ** | Уникальный интент (взлом) |
| `/service/master-zamene-dvernyh.html` | Удалить | 301 → zamena-zamka-dveri.html |
| `/service/sluzhba-vskrytiyu-zamkov.html` | Удалить | 301 → avariynoe-vskrytie-zamkov.html |

## Итог после консолидации

**Было:** 20 страниц услуг
**Останется:** 13 страниц услуг
**Удалено через 301:** 7 страниц

## Преимущества

1. **Устранение каннибализации** — один интент = одна страница
2. **Укрепление веса страниц** — все ссылки ведут на одну страницу
3. **Лучшая индексация** — Google видит чёткую структуру
4. **Улучшение позиций** — концентрация ссылочного веса

## Следующие шаги

1. Создать файл `.htaccess` с 301 редиректами
2. Обновить `sitemap.xml` — удалить удалённые страницы
3. Обновить внутренние ссылки в футере и навигации
4. Добавить canonical на основные страницы
