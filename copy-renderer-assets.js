const fs = require('fs');
const path = require('path');

const srcBase = path.join(__dirname, 'src', 'renderer');
const destBase = path.join(__dirname, 'src', 'renderer-react', 'public');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(destBase)) fs.mkdirSync(destBase, { recursive: true });
copyDir(path.join(srcBase, 'fonts'), path.join(destBase, 'fonts'));
copyDir(path.join(srcBase, 'images'), path.join(destBase, 'images'));

// ensure legacy name still works: if only banner.png exists, also expose as \"defualt banner.png\"
const imagesDir = path.join(destBase, 'images');
const banner = path.join(imagesDir, 'banner.png');
const legacy = path.join(imagesDir, 'defualt banner.png');
if (fs.existsSync(banner) && !fs.existsSync(legacy)) {
  fs.copyFileSync(banner, legacy);
}
