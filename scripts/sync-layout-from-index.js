const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "index.html");

function extractBlock(html, startPattern, endPattern) {
  const re = new RegExp(`${startPattern}[\\s\\S]*?${endPattern}`);
  const match = html.match(re);
  if (!match) throw new Error(`Block not found: ${startPattern}..${endPattern}`);
  return match[0];
}

function replaceBlock(html, startPattern, endPattern, replacement) {
  const re = new RegExp(`${startPattern}[\\s\\S]*?${endPattern}`);
  if (!re.test(html)) return html;
  return html.replace(re, replacement);
}

function getHtmlFiles(dirPath, out = []) {
  const skipDirs = new Set(["node_modules", ".git", "_pgbackup", "Doc"]);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      getHtmlFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) out.push(fullPath);
  }

  return out;
}

function main() {
  const indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
  const navBlock = extractBlock(indexHtml, '<nav class="navbar" id="navbar">', "</nav>");
  const footerBlock = extractBlock(indexHtml, '<footer class="footer">', "</footer>");

  const files = getHtmlFiles(ROOT).filter((f) => path.resolve(f) !== path.resolve(INDEX_PATH));

  let updatedCount = 0;
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    let next = replaceBlock(html, '<nav class="navbar" id="navbar">', "</nav>", navBlock);
    next = replaceBlock(next, '<footer class="footer">', "</footer>", footerBlock);

    if (next !== html) {
      fs.writeFileSync(file, next, "utf8");
      updatedCount += 1;
      console.log(`updated: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`sync-layout-from-index: updated ${updatedCount} page(s)`);
}

main();
