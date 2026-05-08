# Как делать коммиты

## Быстрый вариант

Проверить, что изменилось:

```bash
git status
```

Добавить нужные файлы в коммит:

```bash
git add index.html assets/css/tailwind-custom.css assets/css/styles.css
```

Сделать коммит:

```bash
git commit -m "fix: поправил SEO и валидацию главной страницы"
```

Отправить в удалённый репозиторий:

```bash
git push
```

## Если нужно добавить все изменения сразу

```bash
git add .
git commit -m "feat: обновил главную страницу"
git push
```

## Полезные команды

Посмотреть, что именно изменилось:

```bash
git diff
```

Посмотреть историю коммитов:

```bash
git log --oneline -10
```

Посмотреть, какие файлы попадут в коммит:

```bash
git status
```

## Как лучше называть коммиты

Примеры:

```bash
git commit -m "fix: убрал ошибки валидатора HTML"
git commit -m "fix: исправил стили тегов и бейджей"
git commit -m "feat: обновил SEO-тексты на главной"
git commit -m "chore: пересобрал styles.css"
```

## Простое правило

- `fix` — когда что-то исправил
- `feat` — когда добавил новое
- `chore` — когда техническая правка без новой функции
- `docs` — когда меняешь только документацию

## Для этого проекта обычно удобно

Если менял стили, HTML и собранный CSS:

```bash
git add index.html assets/css/tailwind-custom.css assets/css/styles.css
git commit -m "fix: обновил главную страницу и CSS"
git push
```

## Быстрая шпаргалка по коммитам

```bash
git status
git add index.html assets/css/tailwind-custom.css assets/css/styles.css
git commit -m "fix: обновил SEO и главную страницу"
git push
```
