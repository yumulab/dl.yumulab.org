/** Resolve a site-local path under Astro's configured deployment base. */
export function withBase(path: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
