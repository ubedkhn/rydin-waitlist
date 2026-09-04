import type { Config } from "tailwindcss";
import base from "./tailwind.config";

/**
 * Tailwind config for the standalone preview file.
 *
 * Reuses the real token layer verbatim and only repoints `content`, so the
 * single-file preview and the Next app can never drift on colour, type scale or
 * keyframes. Used by `npm run preview:css`, which compiles the CSS and inlines
 * it into rydin-preview.html — that's why the preview needs no CDN and works
 * offline.
 */
export default {
  ...base,
  content: ["../rydin-preview.html", "./rydin-preview.html"],
} satisfies Config;
