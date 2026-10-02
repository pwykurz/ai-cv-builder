import type { CV, Labels } from '../types';

export function contactRows(
  labels: Labels,
): [string, keyof CV['profile']['contact'], ((v: string) => string) | undefined][] {
  return [
    [labels.email, 'email', (v) => `mailto:${v}`],
    [labels.address, 'address', undefined],
    [labels.phone, 'phone', (v) => `tel:${v.replace(/\s/g, '')}`],
    [labels.linkedin, 'linkedin', (v) => `https://${v}`],
    [labels.website, 'website', (v) => `https://${v}`],
    [labels.github, 'github', (v) => `https://${v}`],
  ];
}
