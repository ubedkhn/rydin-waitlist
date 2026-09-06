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

  content = content.replace(/bg-white dark:bg-slate-900\/([0-9]+)/g, 'bg-white/$1 dark:bg-slate-900/$1');
  // clean up any duplicate dark:bg-slate-900/90
  content = content.replace(/dark:bg-slate-900\/([0-9]+)(.*?)dark:bg-slate-900\/\1/g, 'dark:bg-slate-900/$1$2');

  // Also fix text-slate-500 dark:text-slate-400 dark:text-slate-500
  content = content.replace(/dark:text-slate-400 dark:text-slate-500/g, 'dark:text-slate-400');

  // Fix borders
  content = content.replace(/border-slate-900\/\[([^\]]+)\]/g, 'border-slate-900/[$1] dark:border-slate-50/[$1]');
  content = content.replace(/bg-slate-900\/\[([^\]]+)\]/g, 'bg-slate-900/[$1] dark:bg-slate-50/[$1]');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated opacity in', filePath);
  }
}

walkDir('components', updateFile);
walkDir('app', updateFile);
