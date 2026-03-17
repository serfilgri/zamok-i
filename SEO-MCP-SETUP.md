# 🔥 SEO MCP Система для zamok-i.ru

Полная инструкция по настройке MCP-серверов для продвижения в Google и Яндекс.

---

## 📦 Шаг 1: Установка Node.js (если нет)

```bash
node -v
npm -v
```

Если не установлено — скачай с https://nodejs.org

---

## 📁 Шаг 2: Создание конфигурации MCP

### 2.1. Создай файл `.mcp.json` в корне проекта:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "google-search-console-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "./gsc-key.json"
      }
    },
    "seo": {
      "command": "npx",
      "args": ["-y", "seo-insights-mcp-server"]
    },
    "search": {
      "command": "npx",
      "args": ["-y", "mcp-google-search"]
    }
  }
}
```

### 2.2. Или расширенная версия (рекомендуется):

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "google-search-console-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "./gsc-key.json"
      }
    },
    "seo": {
      "command": "npx",
      "args": ["-y", "seo-insights-mcp-server"]
    },
    "search": {
      "command": "npx",
      "args": ["-y", "mcp-google-search"],
      "env": {
        "GOOGLE_API_KEY": "your-api-key",
        "SEARCH_ENGINE_ID": "your-search-engine-id"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "args": ["./"]
    }
  }
}
```

---

## 🔑 Шаг 3: Настройка Google Search Console

### 3.1. Создай Service Account в Google Cloud

1. Открой https://console.cloud.google.com
2. Создай новый проект (или выбери существующий)
3. Включи **Search Console API**:
   - API & Services → Library → Search Console API → Enable

### 3.2. Создай Service Account

1. IAM & Admin → Service Accounts → Create Service Account
2. Name: `seo-mcp-access`
3. Role: **Service Account User**
4. Click: **Done**

### 3.3. Создай ключ

1. Кликни на созданном сервис-аккаунте
2. Keys → Add Key → Create new key
3. Тип: **JSON**
4. Скачай файл → переименуй в `gsc-key.json`
5. Положи в корень проекта: `/Users/serfil/Desktop/my-project/AGENCY-WEBSITE/gsc-key.json`

### 3.4. Добавь доступ в Google Search Console

1. Открой https://search.google.com/search-console
2. Выбери свой сайт (zamok-i.ru)
3. Settings (шестерёнка) → Users and permissions
4. Add user → вставь email из `gsc-key.json` (ищи поле `client_email`)
5. Дай доступ: **Owner** или **Full**

---

## 🧩 Шаг 4: Подключение в VS Code / WebStorm

### Вариант A: Continue.dev (рекомендуется)

1. Установи расширение **Continue** в VS Code
2. Открой настройки Continue (⌘+L → шестерёнка)
3. Добавь в `config.json`:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "google-search-console-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/Users/serfil/Desktop/my-project/AGENCY-WEBSITE/gsc-key.json"
      }
    },
    "seo": {
      "command": "npx",
      "args": ["-y", "seo-insights-mcp-server"]
    },
    "search": {
      "command": "npx",
      "args": ["-y", "mcp-google-search"]
    }
  }
}
```

### Вариант B: Roo Code

1. Установи расширение **Roo Code**
2. Settings → MCP Servers
3. Добавь тот же конфиг

### Вариант C: Cursor

1. Cursor Settings → MCP
2. Add MCP Server
3. Вставь конфиг

---

## 🚀 Шаг 5: Проверка работы

### 5.1. Тестовый запрос в AI

Открой чат AI (Continue / Roo Code / Cursor) и напиши:

```
Подключись к Google Search Console и покажи топ-10 запросов за последние 7 дней
```

Если MCP настроен правильно — ты получишь данные из GSC.

### 5.2. Если ошибка

**Ошибка: `GOOGLE_APPLICATION_CREDENTIALS not found`**

→ Проверь путь к файлу `gsc-key.json` (должен быть абсолютный путь)

**Ошибка: `Permission denied`**

→ Добавь email сервис-аккаунта в Search Console как Owner

**Ошибка: `No sites found`**

→ Убедись, что сайт добавлен в Search Console и есть данные

---

## 💥 Шаг 6: Готовые SEO-команды для zamok-i.ru

### 🔍 Анализ трафика

```
найди страницы с показами, но без кликов за последние 28 дней
```

```
какие запросы имеют позиции 5-15 и могут вырасти в ТОП?
```

```
покажи динамику трафика за последние 90 дней по страницам
```

### 📉 Поиск проблем

```
найди страницы с падением CTR ниже 1%
```

```
какие страницы не индексируются?
```

```
проверь ошибки индексации в GSC
```

### 💰 Ключевые слова

```
подбери ключевые слова для страницы "замена замков спб"
```

```
найди низкочастотные ключи для "вскрытие замков"
```

```
расширь семантику для "ремонт замков двери"
```

### 🧨 Анализ конкурентов

```
проанализируй топ-10 Google по запросу "замена замков спб"
```

```
какие ключи используют конкуренты в нише "вскрытие замков спб"?
```

```
сравни мои позиции с конкурентами по "срочная замена замков"
```

### ✍️ Генерация контента

```
создай SEO-страницу под ключ "замена замков круглосуточно спб"
```

```
напиши мета-теги для страницы "вскрытие дверей спб"
```

```
оптимизируй текст на index.html под запрос "служба замков спб"
```

### 🔗 Перелинковка

```
предложи стратегию перелинковки для всех страниц сайта
```

```
какие страницы нужно перелинковать для улучшения SEO?
```

### 📊 Отчёты

```
сделай SEO-отчёт за последние 7 дней: позиции, трафик, проблемы
```

```
экспортируй топ-50 запросов в таблицу
```

---

## ⚙️ Шаг 7: Автоматизация (опционально)

### 7.1. n8n + MCP для авто-отчётов

1. Установи n8n: https://n8n.io
2. Добавь MCP-ноду
3. Настрой ежедневный отчёт в Telegram / Email

### 7.2. Пример workflow:

```
Ежедневно в 9:00:
1. Запросить данные из GSC
2. Найти падения позиций > 20%
3. Отправить уведомление в Telegram
```

---

## ❗ Яндекс.Вебмастер

### Проблема

Готового MCP для Яндекс.Вебмастера нет.

### Решение 1: Использовать Google как основу

Яндекс сейчас копирует Google SEO → оптимизируй под Google.

### Решение 2: Своё API

1. Используй Яндекс.Вебмастер API: https://yandex.ru/dev/webmaster
2. Оберни в свой MCP-сервер (Node.js + Express)
3. Подключи как кастомный MCP

Пример кода для своего MCP:

```javascript
// yandex-webmaster-mcp.js
const express = require('express');
const axios = require('axios');

const app = express();
const YANDEX_TOKEN = process.env.YANDEX_OAUTH_TOKEN;
const MASTER_ID = 'your-master-id';

app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;
  
  if (method === 'getYandexPositions') {
    const response = await axios.get(
      `https://api.webmaster.yandex.net/v5/masters/${MASTER_ID/sites`,
      { headers: { Authorization: `OAuth ${YANDEX_TOKEN}` } }
    );
    res.json({ result: response.data });
  }
});

app.listen(3001);
```

---

## 🎯 Специально для zamok-i.ru

### Твои страницы для SEO:

| Страница | Ключевые запросы |
|----------|------------------|
| `/index.html` | служба замков спб, замена замков спб |
| `/services.html` | вскрытие замков, ремонт замков, замена замков |
| `/pricing.html` | цена замена замков, стоимость вскрытия |
| `/about.html` | о компании замки спб |
| `/contact.html` | телефон служба замков, адрес |
| `/faq.html` | вопросы замена замков |
| `/process.html` | как заказать замену замка |

### Рекомендуемые действия:

1. **Добавь Schema.org разметку** для LocalBusiness
2. **Создай страницы под каждый район СПб** (Московский, Невский, etc.)
3. **Добавь блок "Цены"** на главную (Google любит цены)
4. **Сделай FAQ-разметку** (rich snippets в выдаче)

---

## 📚 Полезные ссылки

- [Google Search Console MCP](https://github.com/guides/google-search-console-mcp)
- [SEO Insights MCP](https://github.com/seo-insights/mcp)
- [Continue.dev](https://continue.dev)
- [Roo Code](https://roocode.com)
- [Cursor](https://cursor.sh)
- [n8n](https://n8n.io)
- [Яндекс.Вебмастер API](https://yandex.ru/dev/webmaster)

---

## 🆘 Нужна помощь?

Если что-то не работает:

1. Проверь логи MCP в консоли AI-ассистента
2. Убедись, что `gsc-key.json` имеет правильный путь
3. Перезапусти VS Code / WebStorm

---

**Следующий шаг:** Настрой MCP и напиши первый запрос AI:

> "Покажи мои текущие позиции в Google Search Console за последние 7 дней"

Удачи в продвижении! 🚀
