import { LANGS, type Lang } from '../editing/variants';
import { ensureCvIds } from '../lib/ids';
import type { CV } from '../types';

const fileName = (path: string) => path.replace(/^.*\//, '').replace(/\.json$/, '');
const toVariants = (modules: Record<string, CV>) =>
  Object.fromEntries(Object.entries(modules).map(([path, cv]) => [fileName(path), cv]));

const variants: Record<string, CV> = {
  ...toVariants(import.meta.glob<CV>('../../examples/*.json', { eager: true, import: 'default' })),
  ...toVariants(import.meta.glob<CV>('../../data/*.json', { eager: true, import: 'default' })),
};

export const variantNames = Object.keys(variants).sort();

function pickRaw(name: string): CV {
  const cv = variants[name];
  if (!cv) {
    throw new Error(`No CV "${name}" in data/ or examples/ (found: ${variantNames.join(', ')})`);
  }
  return cv;
}

export function getDataName(): string {
  return new URLSearchParams(window.location.search).get('data') ?? 'cv.en';
}

export function loadCv(name: string): CV {
  return ensureCvIds(pickRaw(name));
}

/** Section headings, "Present", date locale — from the base cv.<lang> files. */
export const languageDefaults = Object.fromEntries(
  LANGS.map((lang) => {
    const { locale, labels } = loadCv(`cv.${lang}`);
    return [lang, { locale, labels }];
  }),
) as Record<Lang, Pick<CV, 'locale' | 'labels'>>;
