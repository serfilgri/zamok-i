#!/usr/bin/env node

/**
 * Скрипт для проверки HTTP-ссылок в проекте
 * Ищет все http:// ссылки в HTML, JS, CSS файлах
 * 
 * Использование: node scripts/check-http-links.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const EXCLUDE_DIRS = ['node_modules', '.git', '.vscode', 'backup', 'backups'];
const FILE_EXTENSIONS = ['.html', '.js', '.css', '.json', '.xml', '.md'];

// Паттерн для поиска http:// ссылок (исключая стандартные xmlns)
const HTTP_PATTERN = /http:\/\/(?!localhost|127\.0\.0\.1)[^\s"'>]+/gi;

function shouldExclude(dirPath) {
  return EXCLUDE_DIRS.some(exclude => dirPath.includes(exclude));
}

function getAllFiles(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!shouldExclude(fullPath)) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (FILE_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Пропускаем строки с bash-командами (curl примеры)
    if (line.includes('curl -I') || line.trim().startsWith('#')) {
      continue;
    }
    
    const matches = line.match(HTTP_PATTERN);
    if (matches) {
      // Фильтруем технические URL (xmlns, svg и т.д.)
      const realMatches = matches.filter(url => {
        return !url.includes('sitemaps.org/schemas') && 
               !url.includes('w3.org/') &&
               !url.includes('schema.org');
      });
      
      if (realMatches.length > 0) {
        issues.push(...realMatches);
      }
    }
  }
  
  return issues;
}

console.log('🔍 Проверка HTTP-ссылок в проекте...\n');

const files = getAllFiles(ROOT_DIR);
let totalIssues = 0;
const issuesByFile = {};

for (const file of files) {
  const relativePath = path.relative(ROOT_DIR, file);
  const matches = checkFile(file);
  
  if (matches.length > 0) {
    issuesByFile[relativePath] = matches;
    totalIssues += matches.length;
  }
}

if (totalIssues === 0) {
  console.log('✅ HTTP-ссылок не найдено. Все ссылки используют HTTPS или относительные пути.');
} else {
  console.log(`❌ Найдено ${totalIssues} HTTP-ссылок в ${Object.keys(issuesByFile).length} файлах:\n`);
  
  for (const [file, matches] of Object.entries(issuesByFile)) {
    console.log(`📄 ${file}:`);
    matches.forEach(url => {
      console.log(`   - ${url}`);
    });
    console.log('');
  }
  
  console.log('💡 Рекомендация: замените все http:// на https:// для домена zamok-i.ru');
  process.exit(1);
}
