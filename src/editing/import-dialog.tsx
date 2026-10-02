import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/ui-strings';
import type { Lang } from './variants';

export type ImportStep = 'upload' | 'text' | Lang | 'save';
export type ImportDone = Partial<Record<ImportStep, boolean>>;

/**
 * Modal shown while a CV is imported: a spinner and the real stages the server reports, so a
 * 15-30 s wait never looks like a hang. The languages run in parallel, hence both are "active"
 * once the text is read.
 */
export function ImportDialog({
  fileName,
  done,
  withSave,
  onCancel,
}: {
  fileName: string;
  done: ImportDone;
  /** The other-language file is written by the client once the content is back. */
  withSave: boolean;
  onCancel: () => void;
}) {
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const canCancel = !done.save && !(done.pl && done.en);

  const steps: { id: ImportStep; label: string; after: ImportStep }[] = [
    { id: 'upload', label: t.importStepUpload, after: 'upload' },
    { id: 'text', label: t.importStepText, after: 'upload' },
    { id: 'pl', label: t.importStepLang('PL'), after: 'text' },
    { id: 'en', label: t.importStepLang('EN'), after: 'text' },
    ...(withSave ? [{ id: 'save' as const, label: t.importStepSave, after: 'en' as const }] : []),
  ];
  // A step is running once the one it follows is done; the save step waits for both languages.
  const active = (id: ImportStep, after: ImportStep) =>
    !done[id] && (id === 'upload' || (id === 'save' ? !!done.pl && !!done.en : !!done[after]));

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canCancel) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canCancel, onCancel]);

  return createPortal(
    <div className="import-overlay">
      <div className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
        <span className="import-spinner" aria-hidden="true" />
        <h2 id="import-dialog-title">{t.importDialogTitle}</h2>
        <p className="import-file">{fileName}</p>
        <ol className="import-steps" aria-live="polite">
          {steps.map(({ id, label, after }) => {
            const state = done[id] ? 'done' : active(id, after) ? 'active' : 'pending';
            return (
              <li key={id} data-state={state}>
                <span className="import-mark" aria-hidden="true">
                  {state === 'done' ? '✓' : ''}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className="import-hint">{t.importDialogHint}</p>
        <button ref={cancelRef} type="button" className="import-cancel" onClick={onCancel} disabled={!canCancel}>
          {t.cancel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
