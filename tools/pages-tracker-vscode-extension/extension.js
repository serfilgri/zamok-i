const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const TRACKER_FILE = path.join("Doc", "pages-tracker.csv");
const SYNC_TASK_LABEL = "Tracker: Sync Pages";
const DEPLOY_TASK_LABEL = "Deploy: FTP + Sync Tracker";

function activate(context) {
  const provider = new PagesTrackerProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("pagesTracker.panel", provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pagesTracker.openPanel", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.pagesTracker");
    })
  );

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess(async (event) => {
      const label = event.execution.task.name || event.execution.task.definition?.label || "";
      if (label === DEPLOY_TASK_LABEL || label === SYNC_TASK_LABEL || label === "deploy:ftp" || label === "sync:pages") {
        await provider.refresh();
      }
    })
  );
}

class PagesTrackerProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => this.handleMessage(message));

    await this.refresh();
  }

  getWorkspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
  }

  getTrackerPath() {
    const root = this.getWorkspaceRoot();
    return root ? path.join(root, TRACKER_FILE) : null;
  }

  async handleMessage(message) {
    switch (message.type) {
      case "ready":
      case "refresh":
        await this.refresh();
        break;
      case "save":
        await this.saveRows(message.rows);
        break;
      case "openPage":
        await this.openPage(message.pagePath);
        break;
      case "runDeploy":
        await this.runTaskByLabel(DEPLOY_TASK_LABEL);
        break;
      case "runSync":
        await this.runTaskByLabel(SYNC_TASK_LABEL);
        break;
      default:
        break;
    }
  }

  async refresh() {
    if (!this.view) {
      return;
    }

    const trackerPath = this.getTrackerPath();
    if (!trackerPath) {
      this.view.webview.postMessage({
        type: "state",
        ok: false,
        message: "Открой папку проекта в VS Code, чтобы использовать tracker.",
      });
      return;
    }

    if (!fs.existsSync(trackerPath)) {
      this.view.webview.postMessage({
        type: "state",
        ok: false,
        message: `Файл ${TRACKER_FILE} пока не найден.`,
      });
      return;
    }

    const text = fs.readFileSync(trackerPath, "utf8");
    const { headers, rows } = parseCsv(text);

    this.view.webview.postMessage({
      type: "data",
      headers,
      rows,
      message: `Загружено ${rows.length} страниц из ${TRACKER_FILE}.`,
    });
  }

  async saveRows(rows) {
    const trackerPath = this.getTrackerPath();
    if (!trackerPath) {
      return;
    }

    const current = parseCsv(fs.readFileSync(trackerPath, "utf8"));
    const text = serializeCsv(current.headers, rows);
    fs.writeFileSync(trackerPath, text, "utf8");

    vscode.window.setStatusBarMessage("Pages Tracker: изменения сохранены", 2500);

    if (this.view) {
      this.view.webview.postMessage({
        type: "saved",
        message: "Изменения сохранены в pages-tracker.csv.",
      });
    }
  }

  async openPage(pagePath) {
    const root = this.getWorkspaceRoot();
    if (!root || !pagePath) {
      return;
    }

    const fileUri = vscode.Uri.file(path.join(root, pagePath));
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  async runTaskByLabel(label) {
    const tasks = await vscode.tasks.fetchTasks();
    const task = tasks.find(
      (item) =>
        item.name === label ||
        item.definition?.label === label ||
        item.source === label
    );

    if (!task) {
      vscode.window.showWarningMessage(`Не найдена task: ${label}`);
      return;
    }

    await vscode.tasks.executeTask(task);
    vscode.window.setStatusBarMessage(`Запущена task: ${label}`, 2500);
  }

  getHtml(webview) {
    const nonce = String(Date.now());
    return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <title>Pages Tracker</title>
    <style>
      :root {
        --bg: #171717;
        --panel: #232323;
        --panel-2: #2d2d2d;
        --line: #3c3c3c;
        --ink: #f4f1e8;
        --muted: #bab3a3;
        --accent: #f0c53a;
        --ok: #73d68c;
        --warn: #f29d5b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 14px;
        background: var(--bg);
        color: var(--ink);
        font: 13px/1.45 system-ui, sans-serif;
      }
      .toolbar, .summary, .table {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 12px;
      }
      .toolbar { padding: 12px; }
      .summary { margin-top: 12px; padding: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .card { border: 1px solid var(--line); background: var(--panel-2); border-radius: 10px; padding: 10px; }
      .card strong { display:block; font-size: 18px; }
      .card span { color: var(--muted); font-size: 11px; text-transform: uppercase; }
      .grid { display:grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: 8px; }
      .field { display:flex; flex-direction:column; gap:4px; }
      .field label { color: var(--muted); font-size: 11px; text-transform: uppercase; }
      .field input, .field select {
        width:100%; background:#1a1a1a; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px 10px;
      }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      button {
        border:1px solid var(--line); border-radius:999px; background:var(--accent); color:#111; padding:7px 10px; font:inherit; font-weight:700; cursor:pointer;
      }
      button.secondary { background:#f6f0de; }
      button.ghost { background:#303030; color: var(--ink); }
      .status { margin-top:10px; color:var(--muted); }
      .table { margin-top:12px; overflow:hidden; }
      .table-wrap { max-height: 70vh; overflow:auto; }
      table { width:100%; border-collapse: collapse; min-width: 1180px; }
      th { position:sticky; top:0; background:#111; text-align:left; padding:10px; font-size:11px; text-transform:uppercase; }
      td { border-top:1px solid var(--line); padding:8px 10px; vertical-align: top; }
      tr.hidden { display:none; }
      tr.in-progress td { background: rgba(240,197,58,0.10); }
      tr.pending-upload td { box-shadow: inset 4px 0 0 var(--warn); }
      tr.ready td { box-shadow: inset 4px 0 0 var(--ok); }
      .path { min-width:220px; }
      .title { min-width:260px; }
      .mini-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
      .mini-actions button { padding:4px 7px; font-size:11px; }
      .cell-input, .cell-select, .cell-area {
        width:100%; background:#1a1a1a; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:7px 8px; font:inherit;
      }
      .cell-area { min-height:64px; resize: vertical; }
      .chip { display:inline-block; border-radius:999px; padding:4px 8px; border:1px solid var(--line); font-size:11px; }
      .chip.pending_upload { background:#4a2d20; color:#ffd6bf; }
      .chip.synced { background:#193825; color:#cbf9d8; }
      .chip.unknown { background:#333; color:#ddd; }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <div class="grid">
        <div class="field">
          <label>Поиск</label>
          <input id="searchInput" type="search" placeholder="URL, title, H1, заметки" />
        </div>
        <div class="field">
          <label>Статус</label>
          <select id="statusFilter">
            <option value="">Все</option>
            <option value="idea">idea</option>
            <option value="in_progress">in_progress</option>
            <option value="needs_update">needs_update</option>
            <option value="reviewed">reviewed</option>
            <option value="ready">ready</option>
            <option value="published">published</option>
          </select>
        </div>
        <div class="field">
          <label>Кластер</label>
          <select id="clusterFilter"><option value="">Все</option></select>
        </div>
        <div class="field">
          <label>Выгрузка</label>
          <select id="deployFilter">
            <option value="">Все</option>
            <option value="pending_upload">изменено</option>
            <option value="synced">выгружено</option>
            <option value="unknown">неизвестно</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button id="saveBtn">Сохранить</button>
        <button id="syncBtn" class="secondary">Синхронизировать страницы</button>
        <button id="deployBtn">Выгрузить сайт</button>
        <button id="refreshBtn" class="ghost">Обновить панель</button>
      </div>
      <div id="statusLine" class="status">Панель загружается…</div>
    </div>
    <div id="summaryGrid" class="summary"></div>
    <div class="table">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Страница</th>
              <th>Title / H1</th>
              <th>Статус</th>
              <th>Выгрузка</th>
              <th>Изм.</th>
              <th>Проверен</th>
              <th>100%</th>
              <th>Заметки</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const STATUS_OPTIONS = ["idea", "in_progress", "needs_update", "reviewed", "ready", "published"];
      const YES_NO_OPTIONS = ["", "yes", "no"];
      const state = { headers: [], rows: [] };

      const rowsEl = document.getElementById("rows");
      const summaryGrid = document.getElementById("summaryGrid");
      const statusLine = document.getElementById("statusLine");
      const searchInput = document.getElementById("searchInput");
      const statusFilter = document.getElementById("statusFilter");
      const clusterFilter = document.getElementById("clusterFilter");
      const deployFilter = document.getElementById("deployFilter");

      function setStatus(text) { statusLine.textContent = text; }

      function escapeHtml(text) {
        return String(text ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
      }

      function escapeAttr(text) {
        return escapeHtml(text).replaceAll('"', "&quot;");
      }

      function buildOptions(items, current) {
        return items.map((item) => \`<option value="\${item}" \${item === current ? "selected" : ""}>\${item || "—"}</option>\`).join("");
      }

      function deployLabel(value) {
        if (value === "pending_upload") return "изменено";
        if (value === "synced") return "выгружено";
        return "неизвестно";
      }

      function renderClusters() {
        const current = clusterFilter.value;
        const clusters = [...new Set(state.rows.map((row) => row.cluster).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
        clusterFilter.innerHTML = '<option value="">Все</option>' + clusters.map((cluster)=>\`<option value="\${escapeAttr(cluster)}">\${escapeHtml(cluster)}</option>\`).join("");
        clusterFilter.value = clusters.includes(current) ? current : "";
      }

      function rowMatches(row) {
        const search = searchInput.value.trim().toLowerCase();
        const haystack = [row.page_path,row.title,row.h1,row.notes].join(" ").toLowerCase();
        if (search && !haystack.includes(search)) return false;
        if (statusFilter.value && row.status !== statusFilter.value) return false;
        if (clusterFilter.value && row.cluster !== clusterFilter.value) return false;
        if (deployFilter.value && row.deploy_state !== deployFilter.value) return false;
        return true;
      }

      function visibleRows() {
        return state.rows.filter(rowMatches);
      }

      function renderSummary() {
        const rows = visibleRows();
        const stats = {
          total: rows.length,
          progress: rows.filter((row)=>row.status === "in_progress").length,
          pending: rows.filter((row)=>row.deploy_state === "pending_upload").length,
          ready: rows.filter((row)=>row.ready_100 === "yes").length
        };
        summaryGrid.innerHTML = [
          ["Строк видно", stats.total],
          ["В работе", stats.progress],
          ["Не выгружено", stats.pending],
          ["100% готово", stats.ready]
        ].map(([label,value])=>\`<div class="card"><strong>\${value}</strong><span>\${label}</span></div>\`).join("");
      }

      function renderRows() {
        rowsEl.innerHTML = state.rows.map((row, index) => {
          const hidden = rowMatches(row) ? "" : "hidden";
          const progressClass = row.status === "in_progress" ? "in-progress" : "";
          const deployClass = row.deploy_state === "pending_upload" ? "pending-upload" : "";
          const readyClass = row.ready_100 === "yes" ? "ready" : "";
          return \`
            <tr class="\${hidden} \${progressClass} \${deployClass} \${readyClass}" data-index="\${index}">
              <td class="path">
                <div><strong>\${escapeHtml(row.page_path)}</strong></div>
                <div class="mini-actions">
                  <button data-open="\${index}">Открыть</button>
                  <button data-work="\${index}">В работу</button>
                  <button data-ready="\${index}">Готово</button>
                  <button data-update="\${index}">Доработать</button>
                </div>
              </td>
              <td class="title">
                <div><strong>\${escapeHtml(row.title || "")}</strong></div>
                <div style="color:#bab3a3;margin-top:4px;">\${escapeHtml(row.h1 || "")}</div>
              </td>
              <td>
                <select class="cell-select" data-field="status" data-index="\${index}">
                  \${buildOptions(STATUS_OPTIONS, row.status)}
                </select>
              </td>
              <td><span class="chip \${escapeAttr(row.deploy_state || "")}">\${escapeHtml(deployLabel(row.deploy_state || ""))}</span></td>
              <td>\${escapeHtml(row.last_modified || "")}</td>
              <td><input class="cell-input" data-field="last_reviewed" data-index="\${index}" value="\${escapeAttr(row.last_reviewed || "")}" /></td>
              <td>
                <select class="cell-select" data-field="ready_100" data-index="\${index}">
                  \${buildOptions(YES_NO_OPTIONS, row.ready_100)}
                </select>
              </td>
              <td><textarea class="cell-area" data-field="notes" data-index="\${index}">\${escapeHtml(row.notes || "")}</textarea></td>
            </tr>
          \`;
        }).join("");

        rowsEl.querySelectorAll("[data-field]").forEach((input) => {
          input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
            const index = Number(input.dataset.index);
            state.rows[index][input.dataset.field] = input.value;
            renderRows();
            renderSummary();
          });
        });

        rowsEl.querySelectorAll("[data-open]").forEach((button) => {
          button.addEventListener("click", () => vscode.postMessage({ type: "openPage", pagePath: state.rows[Number(button.dataset.open)].page_path }));
        });
        rowsEl.querySelectorAll("[data-work]").forEach((button) => {
          button.addEventListener("click", () => {
            const row = state.rows[Number(button.dataset.work)];
            row.status = "in_progress";
            row.last_reviewed = new Date().toISOString().slice(0,10);
            if (!row.notes) row.notes = "Начата работа над страницей";
            renderRows();
            renderSummary();
          });
        });
        rowsEl.querySelectorAll("[data-ready]").forEach((button) => {
          button.addEventListener("click", () => {
            const row = state.rows[Number(button.dataset.ready)];
            row.status = "ready";
            row.ready_100 = "yes";
            row.last_reviewed = new Date().toISOString().slice(0,10);
            if (!row.notes) row.notes = "Страница проверена и готова";
            renderRows();
            renderSummary();
          });
        });
        rowsEl.querySelectorAll("[data-update]").forEach((button) => {
          button.addEventListener("click", () => {
            const row = state.rows[Number(button.dataset.update)];
            row.status = "needs_update";
            row.ready_100 = "no";
            row.last_reviewed = new Date().toISOString().slice(0,10);
            if (!row.notes) row.notes = "Нужно вернуться и доработать страницу";
            renderRows();
            renderSummary();
          });
        });
      }

      function setData(payload) {
        state.headers = payload.headers;
        state.rows = payload.rows;
        renderClusters();
        renderRows();
        renderSummary();
        setStatus(payload.message);
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type === "data") setData(message);
        if (message.type === "saved" || message.type === "state") setStatus(message.message);
      });

      [searchInput, statusFilter, clusterFilter, deployFilter].forEach((el) => {
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
          renderRows();
          renderSummary();
        });
      });

      document.getElementById("saveBtn").addEventListener("click", () => vscode.postMessage({ type: "save", rows: state.rows }));
      document.getElementById("syncBtn").addEventListener("click", () => vscode.postMessage({ type: "runSync" }));
      document.getElementById("deployBtn").addEventListener("click", () => vscode.postMessage({ type: "runDeploy" }));
      document.getElementById("refreshBtn").addEventListener("click", () => vscode.postMessage({ type: "refresh" }));

      vscode.postMessage({ type: "ready" });
    </script>
  </body>
</html>`;
  }
}

function parseCsv(text) {
  const lines = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell !== "")) {
        lines.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    lines.push(row);
  }

  const headers = lines[0] || [];
  const rows = lines.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });

  return { headers, rows };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
