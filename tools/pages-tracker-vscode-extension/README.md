# Pages Tracker VS Code Extension

Локальное расширение для VS Code, которое открывает `Doc/pages-tracker.csv` как редактируемую панель внутри редактора.

Что умеет:

- открывать страницы проекта в редакторе;
- менять статусы и заметки;
- сохранять изменения обратно в `Doc/pages-tracker.csv`;
- запускать task `Deploy: FTP + Sync Tracker`;
- запускать task синхронизации `sync:pages`.

## Как запустить

1. Открой папку `tools/pages-tracker-vscode-extension` как отдельный проект в новом окне VS Code.
2. Нажми `F5`.
3. В новом окне Extension Development Host открой корень сайта `AGENCY-WEBSITE`.
4. В боковой панели появится иконка `Tracker`.
5. Открой `Pages Tracker`.

## Команда

- `Pages Tracker: Open Panel`

## Важно

Расширение работает локально и не требует публикации в marketplace.
