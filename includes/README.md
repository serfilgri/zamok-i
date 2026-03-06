# Система сборки страниц с include-файлами

Эта система позволяет управлять повторяющимся контентом (шапка, подвал, секции) через центральные шаблоны.

## 📁 Структура

```
includes/
├── header.html              # Навигация (navbar)
├── footer.html              # Подвал сайта
└── sections/
    ├── info-general.html    # Общая информационная секция
    ├── info-zamena.html     # Для услуг замены
    ├── info-vskrytie.html   # Для услуг вскрытия
    ├── info-remont.html     # Для услуг ремонта
    ├── info-ustanovka.html  # Для услуг установки
    └── info-contact.html    # Для страницы контактов
```

## 🚀 Использование

### Сборка всех страниц
```bash
npm run build:pages
```

### Watch-режим (автосборка при изменениях)
```bash
npm run watch:pages
```

### Полная сборка (CSS + страницы)
```bash
npm run build
```

## 📝 Как создать новую страницу

### Вариант 1: Автоматически через services-data.json

Добавьте запись в `services-data.json`:

```json
{
  "id": "unique-service-id",
  "title": "Название услуги",
  "description": "Краткое описание для SEO",
  "category": "installation",
  "pagePath": "service/ustanovka/novaya-usluga.html",
  "priceId": "lock_installation"
}
```

Запустите сборку:
```bash
npm run build:pages
```

### Вариант 2: Вручную с использованием шаблонов

Создайте HTML файл с следующей структурой:

```html
<!doctype html>
<html lang="ru">
<head>
  <!-- Meta tags -->
</head>
<body>
  <!--@@include '../includes/header.html' -->
  
  <section class="hero">
    <!-- Ваш контент -->
  </section>
  
  <!--@@include '../includes/sections/info-general.html' -->
  
  <!--@@include '../includes/footer.html' -->
  
  <script src="assets/js/main.js"></script>
</body>
</html>
```

## 🎯 Типы секций

| Секция | Для каких страниц |
|--------|-------------------|
| `info-general` | Универсальная, по умолчанию |
| `info-zamena` | Услуги замены замков |
| `info-vskrytie` | Услуги вскрытия |
| `info-remont` | Услуги ремонта |
| `info-ustanovka` | Услуги установки |
| `info-contact` | Страница контактов |

## 🔄 Обновление контента

### Чтобы обновить навигацию или подвал:
1. Откройте `includes/header.html` или `includes/footer.html`
2. Внесите изменения
3. Запустите `npm run build:pages`
4. Все страницы обновятся автоматически

### Чтобы обновить информационную секцию:
1. Откройте нужный файл в `includes/sections/`
2. Внесите изменения
3. Запустите `npm run build:pages`

## ⚙️ Настройка для страниц услуг

В файле `services-data.json` укажите категорию для автоматического выбора секции:

```json
{
  "category": "installation"  // info-ustanovka.html
  "category": "repair"        // info-remont.html
  "category": "emergency"     // info-vskrytie.html
}
```

## 🛠️ Скрипты

| Команда | Описание |
|---------|----------|
| `npm run build:pages` | Сборка всех страниц |
| `npm run watch:pages` | Автосборка при изменениях |
| `npm run build:css` | Сборка Tailwind CSS |
| `npm run watch:css` | Автосборка CSS |
| `npm run build` | Полная сборка (CSS + страницы) |
| `npm run sync:services` | Синхронизация услуг (старый скрипт) |

## 📊 Преимущества

- ✅ **Одна правка — везде обновление**
- ✅ **Нет дублей кода** (4500+ строк в одном месте)
- ✅ **Уникальный контент** для разных типов услуг
- ✅ **SEO-friendly** (статический HTML)
- ✅ **Быстрая разработка**

## ⚠️ Важно

- Не редактируйте сгенерированные файлы напрямую — изменения будут перезаписаны
- Для уникального контента страниц создавайте новые секции в `includes/sections/`
- Backup файлов перед сборкой не делается — используйте Git

## 🐛 Отладка

Если сборка не работает:
1. Проверьте наличие всех файлов в папке `includes/`
2. Очистите кэш: удалите `node_modules/.cache`
3. Запустите с флагом `--verbose` (если доступно)
4. Проверьте синтаксис JSON в `services-data.json`
