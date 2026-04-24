const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, _pgbackup, _pginfo, .git
      if (!['node_modules', '_pgbackup', '_pginfo', '.git', '.idea', '.vscode'].includes(file)) {
        findHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const htmlFiles = findHtmlFiles(ROOT);
let totalUpdated = 0;

htmlFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Add loading="lazy" and decoding="async" to images that don't have fetchpriority="high"
  // and don't already have loading attribute
  const imgRegex = /<img([^>]*?)>/gi;

  content = content.replace(imgRegex, (match, attrs) => {
    // Skip if already has loading attribute or fetchpriority="high"
    if (attrs.includes('loading=') || attrs.includes('fetchpriority="high"')) {
      return match;
    }

    updated = true;

    // Add loading="lazy" and decoding="async" before the closing >
    return `<img${attrs} loading="lazy" decoding="async">`;
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${path.relative(ROOT, filePath)}`);
    totalUpdated++;
  }
});

console.log(`\nTotal files updated: ${totalUpdated}`);
