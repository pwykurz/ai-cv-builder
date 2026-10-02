import type { CV } from '../types';

// Every variant exists per language as <base>.<lang>.json (cv.en.json, google.pl.json, ...) in data/ or examples/.
export const LANGS = ['pl', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const BASE_VARIANT = 'cv';
export const SAFE_BASE = /^[\w-]+(\.[\w-]+)*$/;

export function parseVariant(name: string): { base: string; lang: Lang | null } {
  const m = /^(.*)\.(pl|en)$/.exec(name);
  return m ? { base: m[1], lang: m[2] as Lang } : { base: name, lang: null };
}

export function variantName(base: string, lang: Lang | null): string {
  return lang ? `${base}.${lang}` : base;
}

export function baseVariantName(lang: Lang): string {
  return variantName(BASE_VARIANT, lang);
}

/** First free "<base>-copy", "<base>-copy-2", … among `taken` bases. */
export function suggestCloneName(base: string, taken: string[]): string {
  const root = base.replace(/-copy(-\d+)?$/, '');
  let candidate = `${root}-copy`;
  let n = 2;
  while (taken.includes(candidate)) {
    candidate = `${root}-copy-${n++}`;
  }
  return candidate;
}

export function goToVariant(name: string) {
  window.location.href = `?data=${encodeURIComponent(name)}`;
}

export async function saveVariant(name: string, cv: CV) {
  const res = await fetch(`/__save-cv?data=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cv),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
