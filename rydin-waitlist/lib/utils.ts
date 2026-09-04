/**
 * Minimal class-name joiner. Kept dependency-free on purpose — the shell has no
 * conditional-variant explosion that would justify pulling in clsx +
 * tailwind-merge. Falsy values are dropped so `cn("a", cond && "b")` reads clean.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
