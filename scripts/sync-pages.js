const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TRACKER_PATH = path.join(ROOT, "Doc", "pages-tracker.csv");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const DEPLOY_STAMP_PATH = path.join(ROOT, ".deploy.last_success");

const TRACKER_HEADERS = [
  "page_path",
  "title",
  "h1",
  "target_query",
  "cluster",
  "status",
  "file_exists",
  "in_sitemap",
  "deploy_state",
  "last_modified",
  "deployed_at",
  "gsc_position",
  "gsc_clicks",
  "gsc_impressions",
  "gsc_ctr_percent",
  "gsc_page",
  "gsc_last_checked",
  "last_reviewed",
  "ready_100",
  "index_google",
  "index_yandex",
  "notes",
];

const IGNORED_DIRS = new Set([
  ".git",
  ".github",
  ".idea",
  ".vscode",
  ".tools",
  "node_modules",
  "includes",
  "Doc",
  "docker",
  "scripts",
  "_pgbackup",
  "_pginfo",
]);

const IGNORED_FILES = new Set(["test-include.html"]);

function shouldIgnoreFile(filePath) {
  const baseName = path.basename(filePath);
  if (!baseName.endsWith(".html")) {
    return true;
  }

  if (IGNORED_FILES.has(baseName)) {
    return true;
  }

  return /(?:\.backup-\d{4}-\d{2}-\d{2}|_\d{10})\.html$/i.test(baseName);
}

function collectHtmlFiles(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectHtmlFiles(fullPath, fileList);
      }
      continue;
    }

    if (!shouldIgnoreFile(relativePath)) {
      fileList.push(relativePath);
    }
  }

  return fileList.sort((a, b) => a.localeCompare(b, "ru"));
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, " "));
}

function extractFirstMatch(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1]) : "";
}

function readPageMeta(pagePath) {
  const absolutePath = path.join(ROOT, pagePath);
  const html = fs.readFileSync(absolutePath, "utf8");
  const stat = fs.statSync(absolutePath);
  const deployStamp = getDeployStamp();

  return {
    page_path: pagePath,
    title: extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    h1: extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    target_query: "",
    cluster: inferCluster(pagePath),
    status: "idea",
    file_exists: "yes",
    in_sitemap: isInSitemap(pagePath) ? "yes" : "no",
    deploy_state: getDeployState(stat, deployStamp),
    last_modified: stat.mtime.toISOString().slice(0, 10),
    deployed_at: deployStamp ? deployStamp.toISOString().slice(0, 10) : "",
    gsc_position: "",
    gsc_clicks: "",
    gsc_impressions: "",
    gsc_ctr_percent: "",
    gsc_page: "",
    gsc_last_checked: "",
    last_reviewed: "",
    ready_100: "no",
    index_google: "",
    index_yandex: "",
    notes: "auto-added",
  };
}

let deployStampCache;

function getDeployStamp() {
  if (deployStampCache !== undefined) {
    return deployStampCache;
  }

  if (!fs.existsSync(DEPLOY_STAMP_PATH)) {
    deployStampCache = null;
    return deployStampCache;
  }

  deployStampCache = fs.statSync(DEPLOY_STAMP_PATH).mtime;
  return deployStampCache;
}

function getDeployState(fileStat, deployStamp) {
  if (!deployStamp) {
    return "unknown";
  }

  return fileStat.mtime > deployStamp ? "pending_upload" : "synced";
}

function inferCluster(pagePath) {
  const segments = pagePath.split("/");

  if (pagePath === "index.html") {
    return "home";
  }

  if (segments[0] === "service") {
    if (segments.length === 2) {
      return "service";
    }
    if (segments[1] === "zamena" && segments[2] === "raiony") {
      return "zamena-raiony";
    }
    return segments[1] || "service";
  }

  if (segments.length === 1) {
    return "site";
  }

  return segments[0];
}

let sitemapSetCache = null;

function loadSitemapSet() {
  if (sitemapSetCache) {
    return sitemapSetCache;
  }

  sitemapSetCache = new Set();

  if (!fs.existsSync(SITEMAP_PATH)) {
    return sitemapSetCache;
  }

  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);

  for (const match of matches) {
    try {
      const url = new URL(match[1]);
      const relative = url.pathname.replace(/^\/+/, "") || "index.html";
      sitemapSetCache.add(relative);
    } catch {
      // Ignore invalid loc values.
    }
  }

  return sitemapSetCache;
}

function isInSitemap(pagePath) {
  return loadSitemapSet().has(pagePath);
}

function parseCsv(text) {
  const rows = [];
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
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function readTracker() {
  if (!fs.existsSync(TRACKER_PATH)) {
    return new Map();
  }

  const content = fs.readFileSync(TRACKER_PATH, "utf8");
  if (!content.trim()) {
    return new Map();
  }

  const parsed = parseCsv(content);
  if (!parsed.length) {
    return new Map();
  }

  const headers = parsed[0];
  const records = new Map();

  for (const values of parsed.slice(1)) {
    if (!values.some((cell) => String(cell || "").trim() !== "")) {
      continue;
    }
    const record = {};

    for (let i = 0; i < TRACKER_HEADERS.length; i += 1) {
      const header = TRACKER_HEADERS[i];
      const sourceIndex = headers.indexOf(header);
      record[header] = sourceIndex >= 0 ? values[sourceIndex] || "" : "";
    }

    if (record.page_path) {
      records.set(record.page_path, record);
    }
  }

  return records;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function writeTracker(records) {
  const rows = [TRACKER_HEADERS.join(",")];

  for (const record of records) {
    rows.push(TRACKER_HEADERS.map((header) => csvEscape(record[header] || "")).join(","));
  }

  fs.writeFileSync(TRACKER_PATH, `${rows.join("\n")}\n`, "utf8");
}

function buildDuplicateReport(records, fieldName) {
  const groups = new Map();

  for (const record of records) {
    const value = normalizeWhitespace(record[fieldName] || "").toLowerCase();
    if (!value) {
      continue;
    }

    const list = groups.get(value) || [];
    list.push(record.page_path);
    groups.set(value, list);
  }

  return [...groups.entries()].filter(([, pages]) => pages.length > 1);
}

function syncPages() {
  const discoveredPages = collectHtmlFiles(ROOT);
  const trackerMap = readTracker();
  const mergedRecords = [];
  let addedCount = 0;
  let updatedCount = 0;

  for (const pagePath of discoveredPages) {
    const pageMeta = readPageMeta(pagePath);
    const existing = trackerMap.get(pagePath);

    if (!existing) {
      mergedRecords.push(pageMeta);
      addedCount += 1;
      continue;
    }

    const merged = {
      ...pageMeta,
      ...existing,
      page_path: pagePath,
      title: pageMeta.title || existing.title,
      h1: pageMeta.h1 || existing.h1,
      target_query: existing.target_query || "",
      cluster:
        !existing.cluster || existing.cluster.endsWith(".html")
          ? pageMeta.cluster
          : existing.cluster,
      file_exists: "yes",
      in_sitemap: pageMeta.in_sitemap,
      deploy_state: pageMeta.deploy_state,
      last_modified: pageMeta.last_modified,
      deployed_at: pageMeta.deployed_at || existing.deployed_at || "",
      gsc_position: existing.gsc_position || "",
      gsc_clicks: existing.gsc_clicks || "",
      gsc_impressions: existing.gsc_impressions || "",
      gsc_ctr_percent: existing.gsc_ctr_percent || "",
      gsc_page: existing.gsc_page || "",
      gsc_last_checked: existing.gsc_last_checked || "",
      status: existing.status || pageMeta.status,
      last_reviewed: existing.last_reviewed || "",
      ready_100: existing.ready_100 || "no",
      index_google: existing.index_google || "",
      index_yandex: existing.index_yandex || "",
      notes: existing.notes || "",
    };

    mergedRecords.push(merged);
    trackerMap.delete(pagePath);
    updatedCount += 1;
  }

  for (const staleRecord of trackerMap.values()) {
    mergedRecords.push({
      ...staleRecord,
      file_exists: "no",
    });
  }

  mergedRecords.sort((a, b) => a.page_path.localeCompare(b.page_path, "ru"));
  writeTracker(mergedRecords);

  const duplicateTitles = buildDuplicateReport(mergedRecords, "title");
  const duplicateH1 = buildDuplicateReport(mergedRecords, "h1");

  console.log(`Tracker synced: ${TRACKER_PATH}`);
  console.log(`Pages found: ${discoveredPages.length}`);
  console.log(`Added: ${addedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Missing files kept in tracker: ${trackerMap.size}`);

  if (duplicateTitles.length > 0) {
    console.log("\nPossible duplicate <title> values:");
    for (const [value, pages] of duplicateTitles) {
      console.log(`- ${value}: ${pages.join(", ")}`);
    }
  }

  if (duplicateH1.length > 0) {
    console.log("\nPossible duplicate <h1> values:");
    for (const [value, pages] of duplicateH1) {
      console.log(`- ${value}: ${pages.join(", ")}`);
    }
  }
}

syncPages();
