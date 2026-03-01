const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "assets", "images", "source");
const OUTPUT_ROOT = path.join(ROOT, "assets", "images", "webp");
const WATCH_MODE = process.argv.includes("--watch");
const FORCE_MODE = process.argv.includes("--force");
const MAGICK_BINS = [process.env.MAGICK_BIN, "magick", "/Applications/ServBay/bin/magick"].filter(Boolean);

const PRESETS = [
  { name: "hero", width: 800, height: 480, fit: "cover" },
  { name: "about", width: 800, height: 520, fit: "cover" },
  { name: "card", width: 600, height: 400, fit: "cover" },
  { name: "thumb", width: 320, height: 220, fit: "cover" },
  { name: "og", width: 1200, height: 630, fit: "cover" },
];

const SUPPORTED_INPUTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_INPUTS.has(ext);
}

function collectFiles(dirPath, out = []) {
  if (!fs.existsSync(dirPath)) return out;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    if (entry.isFile() && isImageFile(full)) out.push(full);
  }
  return out;
}

function getRelativeSourcePath(sourceFile) {
  return path.relative(SOURCE_DIR, sourceFile);
}

function getOutputPath(sourceFile, preset) {
  const relative = getRelativeSourcePath(sourceFile);
  const dir = path.dirname(relative);
  const base = path.basename(relative, path.extname(relative));
  const folder = `${preset.name}-${preset.width}x${preset.height}`;
  return path.join(OUTPUT_ROOT, folder, dir, `${base}.webp`);
}

function getOriginalOutputPath(sourceFile) {
  const relative = getRelativeSourcePath(sourceFile);
  const dir = path.dirname(relative);
  const base = path.basename(relative, path.extname(relative));
  return path.join(OUTPUT_ROOT, "original-webp", dir, `${base}.webp`);
}

function shouldSkip(sourcePath, targetPath) {
  if (FORCE_MODE) return false;
  if (!fs.existsSync(targetPath)) return false;

  const srcStat = fs.statSync(sourcePath);
  const dstStat = fs.statSync(targetPath);
  return dstStat.mtimeMs >= srcStat.mtimeMs;
}

function runMagick(args, sourcePath, targetPath) {
  let lastError = null;

  for (const command of MAGICK_BINS) {
    const result = spawnSync(command, args, { stdio: "pipe" });

    if (!result.error && result.status === 0) return;

    if (result.error && result.error.code === "ENOENT") {
      lastError = `${command} not found`;
      continue;
    }

    const stderr = (result.stderr || "").toString().trim();
    lastError = stderr || `exit code ${result.status}`;
  }

  if (lastError) {
    throw new Error(
      `magick failed for ${path.basename(sourcePath)} -> ${path.basename(targetPath)} (${lastError})`
    );
  }
}

function convertOriginal(sourcePath) {
  const outPath = getOriginalOutputPath(sourcePath);
  if (shouldSkip(sourcePath, outPath)) return false;

  ensureDir(path.dirname(outPath));
  runMagick([sourcePath, "-auto-orient", "-quality", "82", outPath], sourcePath, outPath);
  return true;
}

function convertPreset(sourcePath, preset) {
  const outPath = getOutputPath(sourcePath, preset);
  if (shouldSkip(sourcePath, outPath)) return false;

  ensureDir(path.dirname(outPath));
  runMagick(
    [
      sourcePath,
      "-auto-orient",
      "-resize",
      `${preset.width}x${preset.height}^`,
      "-gravity",
      "center",
      "-extent",
      `${preset.width}x${preset.height}`,
      "-quality",
      "82",
      outPath,
    ],
    sourcePath,
    outPath
  );
  return true;
}

function processFile(sourcePath) {
  const relative = getRelativeSourcePath(sourcePath);
  let wrote = 0;

  try {
    if (convertOriginal(sourcePath)) wrote += 1;

    for (const preset of PRESETS) {
      if (convertPreset(sourcePath, preset)) wrote += 1;
    }

    if (wrote > 0) {
      console.log(`optimized: ${relative} -> ${wrote} variant(s)`);
    }
  } catch (error) {
    console.error(`failed: ${relative} (${error.message})`);
  }
}

function removeVariants(sourcePath) {
  const targets = [getOriginalOutputPath(sourcePath), ...PRESETS.map((preset) => getOutputPath(sourcePath, preset))];
  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    fs.unlinkSync(file);
    console.log(`deleted: ${path.relative(ROOT, file)}`);
  }
}

function processAll() {
  ensureDir(SOURCE_DIR);
  ensureDir(OUTPUT_ROOT);

  const files = collectFiles(SOURCE_DIR);
  if (!files.length) {
    console.log("optimize-images: no source images found");
    return;
  }

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    processFile(file);
  }

  console.log(`optimize-images: processed ${files.length} file(s)`);
}

function watchTree() {
  ensureDir(SOURCE_DIR);
  ensureDir(OUTPUT_ROOT);

  const watchedDirs = new Set();
  const debounceByPath = new Map();

  function queueFile(filePath, eventName) {
    if (!isImageFile(filePath)) return;

    const key = `${eventName}:${filePath}`;
    if (debounceByPath.has(key)) clearTimeout(debounceByPath.get(key));

    const timer = setTimeout(() => {
      debounceByPath.delete(key);

      if (!fs.existsSync(filePath)) {
        removeVariants(filePath);
        return;
      }

      processFile(filePath);
    }, 120);

    debounceByPath.set(key, timer);
  }

  function watchDirectory(dirPath) {
    if (watchedDirs.has(dirPath)) return;
    watchedDirs.add(dirPath);

    fs.watch(dirPath, { persistent: true }, (eventName, filename) => {
      if (!filename) return;
      const fullPath = path.join(dirPath, filename.toString());

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        watchDirectory(fullPath);
        return;
      }

      queueFile(fullPath, eventName);
    });

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      watchDirectory(path.join(dirPath, entry.name));
    }
  }

  watchDirectory(SOURCE_DIR);
  console.log(`optimize-images: watch mode enabled (${path.relative(ROOT, SOURCE_DIR)})`);
}

function run() {
  processAll();
  if (WATCH_MODE) watchTree();
}

try {
  run();
} catch (error) {
  console.error(`optimize-images: ${error.message}`);
  process.exitCode = 1;
}
