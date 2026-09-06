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

  // Backgrounds
  content = content.replace(/\bbg-white\b(?!\s*dark:)/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/\bbg-slate-50\b(?!\s*dark:)/g, 'bg-slate-50 dark:bg-slate-800/50');
  content = content.replace(/\bbg-slate-100\b(?!\s*dark:)/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/\bbg-slate-200\b(?!\s*dark:)/g, 'bg-slate-200 dark:bg-slate-700');

  // Text colors
  content = content.replace(/\btext-slate-900\b(?!\s*dark:)/g, 'text-slate-900 dark:text-slate-50');
  content = content.replace(/\btext-slate-800\b(?!\s*dark:)/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/\btext-slate-700\b(?!\s*dark:)/g, 'text-slate-700 dark:text-slate-200');
  content = content.replace(/\btext-slate-600\b(?!\s*dark:)/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/\btext-slate-500\b(?!\s*dark:)/g, 'text-slate-500 dark:text-slate-400');
  
  // Borders
  content = content.replace(/\bborder-slate-200\b(?!\s*dark:)/g, 'border-slate-200 dark:border-slate-800');
  content = content.replace(/\bborder-slate-300\b(?!\s*dark:)/g, 'border-slate-300 dark:border-slate-700');
  
  // Divide
  content = content.replace(/\bdivide-slate-200\b(?!\s*dark:)/g, 'divide-slate-200 dark:divide-slate-800');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

walkDir('components', updateFile);
walkDir('app', updateFile);

