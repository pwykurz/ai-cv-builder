import type { ImportedCv } from '../lib/merge-cv';
import type { Lang } from './variants';

/** Does the dev server have an Anthropic API key? (Without it the Upload CV button is disabled.) */
export async function fetchImportAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/__import-cv/status');
    return res.ok && ((await res.json()) as { available: boolean }).available;
  } catch {
    return false;
  }
}

/** What the server reports while it works: file accepted, text read, each language done. */
export type ImportProgress = { type: 'start' } | { type: 'text' } | { type: 'lang'; lang: Lang };

type ImportEvent =
  ImportProgress | ({ type: 'result' } & Record<Lang, ImportedCv>) | { type: 'error'; message: string };

/**
 * Has Claude read the file; the CV content comes back in both languages. The server streams one
 * JSON event per line, so `onProgress` follows the real stages. Aborting `signal` cancels the work.
 */
export async function importCvFile(
  file: File,
  onProgress: (event: ImportProgress) => void,
  signal?: AbortSignal,
): Promise<Record<Lang, ImportedCv>> {
  const res = await fetch('/__import-cv', { method: 'POST', body: file, signal });
  if (!res.ok) throw new Error(await res.text());
  if (!res.body) throw new Error('No response from the server');

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let result: Record<Lang, ImportedCv> | null = null;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ImportEvent;
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'result') result = { pl: event.pl, en: event.en };
    else onProgress(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handle);
    }
    if (done) break;
  }
  handle(buffer);
  if (!result) throw new Error('The import ended without a result');
  return result;
}
