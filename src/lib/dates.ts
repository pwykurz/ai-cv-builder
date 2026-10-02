/** "2021-06" -> "Jun 2021"; "2021" stays "2021". */
export function formatDate(value: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

export function formatRange(start: string, end: string | null, locale: string, presentLabel: string): string {
  const to = end ? formatDate(end, locale) : presentLabel;
  return `${formatDate(start, locale)} – ${to}`;
}
