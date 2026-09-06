const fs = require('fs');

let provider = fs.readFileSync('components/site/ThemeProvider.tsx', 'utf8');
provider = provider.replace(
  'type ThemeProviderState = {',
  'type ThemeProviderState = {\n  resolvedTheme: "dark" | "light";'
);
provider = provider.replace(
  'const initialState: ThemeProviderState = {',
  'const initialState: ThemeProviderState = {\n  resolvedTheme: "light",'
);

// We need to keep track of resolvedTheme in state
provider = provider.replace(
  'const [mounted, setMounted] = useState(false);',
  'const [mounted, setMounted] = useState(false);\n  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");'
);

// In useEffect:
provider = provider.replace(
  'root.classList.add(systemTheme);\n      return;',
  'root.classList.add(systemTheme);\n      setResolvedTheme(systemTheme);\n      return;'
);
provider = provider.replace(
  'root.classList.add(theme);\n    localStorage.setItem("rydin-theme", theme);',
  'root.classList.add(theme);\n    setResolvedTheme(theme as "dark" | "light");\n    localStorage.setItem("rydin-theme", theme);'
);

provider = provider.replace(
  'const value = {',
  'const value = {\n    resolvedTheme,'
);

fs.writeFileSync('components/site/ThemeProvider.tsx', provider);

let header = fs.readFileSync('components/site/Header.tsx', 'utf8');
header = header.replace(
  'const { theme, setTheme } = useTheme();',
  'const { theme, setTheme, resolvedTheme } = useTheme();'
);
header = header.replace(
  'onClick={() => setTheme(theme === "dark" ? "light" : "dark")}',
  'onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}'
);
header = header.replace(
  '{theme === "dark" ? (',
  '{resolvedTheme === "dark" ? ('
);

fs.writeFileSync('components/site/Header.tsx', header);

