const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SITE_URL = process.env.SITE_URL || "https://zamok-i.ru";
const OUTPUT_PATH = path.join(ROOT, "sitemap.xml");

const EXCLUDED_PREFIXES = [
  ".tools/",
  "_pgbackup/",
  "_pginfo/",
  "includes/",
  "node_modules/",
  ".git/",
  ".idea/",
  ".vscode/",
  "Doc/",
];

const EXCLUDED_FILES = new Set(["landing-master.html", "test-include.html"]);
const REDIRECTED_FILES = new Set([
  "service/master-zamene-dvernyh.html",
  "service/remont/masterskaya-remontu-zamkov.html",
  "service/remont/remont-zamka-vhodnoy.html",
  "service/sluzhba-vskrytiyu-zamkov.html",
  "service/vskrytie/vskrytie-zamkov-kvartire.html",
  "service/vyzvat-mastera-vskrytiyu.html",
  "service/zamena/zamena-dvernyh-zamkov.html",
  "service/zamena/zamena-zamka-vhodnoy-dveri.html",
  "service/zamena/zamena-zamkov-spb.html",
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isPublicHtml(relPath) {
  if (relPath.startsWith(".")) return false;
  if (!relPath.endsWith(".html")) return false;
  if (EXCLUDED_FILES.has(relPath)) return false;
  if (REDIRECTED_FILES.has(relPath)) return false;
  if (relPath.includes(".backup-")) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function extractTagValue(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function getCanonicalOrDefault(relPath, html) {
  const canonical = extractTagValue(
    html,
    /<link\s+rel="canonical"\s+href="([^"]+)"/i,
  );

  if (canonical) return canonical;
  if (relPath === "index.html") return `${SITE_URL}/`;
  return `${SITE_URL}/${relPath}`;
}

function isIndexable(html) {
  const robots = extractTagValue(
    html,
    /<meta\s+name="robots"\s+content="([^"]+)"/i,
  ).toLowerCase();

  return !robots.includes("noindex");
}

function getMeta(relPath) {
  if (relPath === "index.html") {
    return { priority: "1.0", changefreq: "weekly" };
  }

  if (relPath === "services.html") {
    return { priority: "0.9", changefreq: "weekly" };
  }

  if (relPath.startsWith("service/")) {
    return { priority: "0.7", changefreq: "monthly" };
  }

  if (relPath === "about.html") {
    return { priority: "0.8", changefreq: "monthly" };
  }

  if (
    ["pricing.html", "process.html", "contact.html"].includes(relPath)
  ) {
    return { priority: "0.7", changefreq: "monthly" };
  }

  if (relPath === "faq.html") {
    return { priority: "0.6", changefreq: "monthly" };
  }

  if (["policy.html", "offer.html"].includes(relPath)) {
    return { priority: "0.3", changefreq: "yearly" };
  }

  return { priority: "0.5", changefreq: "monthly" };
}

function getLastmod(relPath) {
  const stat = fs.statSync(path.join(ROOT, relPath));
  return stat.mtime.toISOString().slice(0, 10);
}

function buildUrlEntry(relPath) {
  const html = readFile(relPath);
  if (!isIndexable(html)) return null;

  const loc = getCanonicalOrDefault(relPath, html);
  const { priority, changefreq } = getMeta(relPath);

  return {
    relPath,
    loc,
    lastmod: getLastmod(relPath),
    priority,
    changefreq,
  };
}

function compareEntries(a, b) {
  if (a.relPath === "index.html") return -1;
  if (b.relPath === "index.html") return 1;
  return a.relPath.localeCompare(b.relPath, "ru");
}

function buildSitemap(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${entry.loc}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const rawEntries = walk(ROOT)
    .map((filePath) => toPosix(path.relative(ROOT, filePath)))
    .filter(isPublicHtml)
    .map(buildUrlEntry)
    .filter(Boolean);

  const entries = Array.from(
    new Map(rawEntries.map((entry) => [entry.loc, entry])).values(),
  ).sort(compareEntries);

  fs.writeFileSync(OUTPUT_PATH, buildSitemap(entries), "utf8");
  console.log(`Generated sitemap with ${entries.length} URLs: ${OUTPUT_PATH}`);
}

main();
