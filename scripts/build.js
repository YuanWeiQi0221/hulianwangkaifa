const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "public");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(srcRel, destRel) {
  const src = path.join(projectRoot, srcRel);
  const dest = path.join(projectRoot, destRel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  ensureDir(outDir);

  copyFile("index.html", "public/index.html");
  copyFile("styles.css", "public/styles.css");
  copyFile("app.js", "public/app.js");

  process.stdout.write("Build output written to public/\n");
}

main();

