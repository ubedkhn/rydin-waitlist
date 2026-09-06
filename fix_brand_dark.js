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

  // Brand text colors
  content = content.replace(/\btext-brand-700\b(?!\s*dark:)/g, 'text-brand-700 dark:text-brand-300');
  content = content.replace(/\btext-brand-600\b(?!\s*dark:)/g, 'text-brand-600 dark:text-brand-400');
  content = content.replace(/\btext-brand-800\b(?!\s*dark:)/g, 'text-brand-800 dark:text-brand-200');

  // Brand backgrounds
  content = content.replace(/\bbg-brand-50\b(?!\s*dark:)/g, 'bg-brand-50 dark:bg-brand-500/10');
  content = content.replace(/\bring-brand-500\/20\b(?!\s*dark:)/g, 'ring-brand-500/20 dark:ring-brand-500/30');

  // Any remaining white backgrounds with opacity
  content = content.replace(/\bbg-white\/90\b(?!\s*dark:)/g, 'bg-white/90 dark:bg-slate-900/90');
  content = content.replace(/\bbg-white\/80\b(?!\s*dark:)/g, 'bg-white/80 dark:bg-slate-900/80');

  // Waitlist specific
  content = content.replace(/\bbg-white\/20\b(?!\s*dark:)/g, 'bg-white/20 dark:bg-white/10');

  // Slate text remaining
  content = content.replace(/\btext-slate-400\b(?!\s*dark:)/g, 'text-slate-400 dark:text-slate-500');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

walkDir('components', updateFile);
walkDir('app', updateFile);

