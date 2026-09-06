const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function updateFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add dark variants to paper classes
  content = content.replace(/\bbg-paper-raise\b(?!\s*dark:)/g, 'bg-paper-raise dark:bg-slate-900');
  content = content.replace(/\bbg-paper-sunken\b(?!\s*dark:)/g, 'bg-paper-sunken dark:bg-slate-800');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated paper classes in', filePath);
  }
}

walkDir('components', updateFile);
walkDir('app', updateFile);
