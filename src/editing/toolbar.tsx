import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { UI_LANGS, useT, type UiLang } from '../i18n/ui-strings';
import { importSummary, mergeCv } from '../lib/merge-cv';
import type { CV } from '../types';
import { ImportDialog, type ImportDone, type ImportStep } from './import-dialog';
import { fetchImportAvailable, importCvFile } from './import-cv';
import {
  baseVariantName,
  errorText,
  goToVariant,
  parseVariant,
  saveVariant,
  suggestCloneName,
  variantName,
  type Lang,
  LANGS,
  SAFE_BASE,
} from './variants';

function useDraggable() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragOffset.current) return;
      setPos({ x: e.clientX - dragOffset.current.dx, y: e.clientY - dragOffset.current.dy });
    }
    function onUp() {
      dragOffset.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const toolbar = e.currentTarget.closest('.toolbar') as HTMLElement | null;
    const rect = (toolbar ?? e.currentTarget).getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  };

  return { pos, onPointerDown };
}

const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const FILE_ICON = icon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
  </>,
);
const CHEVRON_ICON = icon(<path d="m6 9 6 6 6-6" />);
const SAVE_ICON = icon(
  <>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </>,
);
const UNDO_ICON = icon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </>,
);
const FLAGS: Record<UiLang, ReactNode> = {
  pl: (
    <svg viewBox="0 0 16 10" width="20" height="13" aria-hidden="true">
      <rect width="16" height="5" fill="#fff" />
      <rect y="5" width="16" height="5" fill="#dc143c" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 60 30" width="20" height="13" aria-hidden="true">
      <clipPath id="uk-flag-cut">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="4" clipPath="url(#uk-flag-cut)" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
};
const DOWNLOAD_ICON = icon(
  <>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </>,
);

const CHECK_ICON = icon(<path d="m5 12 5 5L20 7" />);
const UPLOAD_ICON = icon(
  <>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 19h16" />
  </>,
);

function FileMenu({
  cv,
  dataName,
  dirty,
  variantNames,
}: {
  cv: CV;
  dataName: string;
  dirty: boolean;
  variantNames: string[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [dupName, setDupName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dupInputRef = useRef<HTMLInputElement>(null);

  const { base, lang } = parseVariant(dataName);
  const sameLang = variantNames.filter((n) => parseVariant(n).lang === lang);
  const takenBases = sameLang.map((n) => parseVariant(n).base);
  const isProtected = base === 'cv';

  const close = () => {
    setOpen(false);
    setDupName(null);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (dupName !== null) dupInputRef.current?.select();
  }, [dupName]);

  const switchTo = (name: string) => {
    if (name === dataName) return close();
    if (dirty && !window.confirm(t.discardAndOpen(parseVariant(name).base))) return;
    goToVariant(name);
  };

  const duplicate = async () => {
    const newBase = parseVariant((dupName ?? '').trim()).base;
    if (!SAFE_BASE.test(newBase)) return setError(t.badName);
    const name = variantName(newBase, lang);
    if (variantNames.includes(name)) return setError(t.nameTaken(newBase));
    setBusy(true);
    setError(null);
    try {
      await saveVariant(name, cv);
      goToVariant(name);
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
    }
  };

  const remove = async () => {
    if (!window.confirm(t.confirmDelete(base, (lang ?? '').toUpperCase()))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/__delete-cv?data=${encodeURIComponent(dataName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      goToVariant(baseVariantName(lang ?? 'en'));
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
    }
  };

  return (
    <div className="file-menu" ref={rootRef}>
      <button
        type="button"
        className="tb-btn file-btn"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.pickVariant}
      >
        {FILE_ICON}
        <span>{base}</span>
        <span className="chevron">{CHEVRON_ICON}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          {dupName === null ? (
            <>
              <div className="menu-label">
                {t.variants}
                {lang ? ` (${lang.toUpperCase()})` : ''}
              </div>
              {sameLang.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="menuitemradio"
                  aria-checked={name === dataName}
                  className="menu-item"
                  onClick={() => switchTo(name)}
                >
                  <span className="check">{name === dataName ? '✓' : ''}</span>
                  {parseVariant(name).base}
                </button>
              ))}
              <div className="menu-sep" />
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => setDupName(suggestCloneName(base, takenBases))}
              >
                <span className="check" />
                {t.duplicateAs}
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item danger"
                onClick={() => void remove()}
                disabled={isProtected || busy}
                title={isProtected ? t.protectedTitle : undefined}
              >
                <span className="check" />
                {t.removeVariant(base)}
                {isProtected && <span className="hint">{t.protectedHint}</span>}
              </button>
            </>
          ) : (
            <form
              className="menu-form"
              onSubmit={(e) => {
                e.preventDefault();
                void duplicate();
              }}
            >
              <div className="menu-label">
                {t.duplicatePrefix} <span className="menu-label-name">{base}</span> {t.duplicateSuffix}
              </div>
              <input
                ref={dupInputRef}
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                spellCheck={false}
                aria-label={t.newVariantName}
              />
              <div className="menu-form-actions">
                <button type="button" className="tb-btn" onClick={() => setDupName(null)}>
                  {t.cancel}
                </button>
                <button type="submit" className="tb-btn primary" disabled={busy}>
                  {t.create}
                </button>
              </div>
            </form>
          )}
          {error && <div className="toolbar-error">{error}</div>}
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  cv,
  dataName,
  dirty,
  editMode,
  onEditModeChange,
  onSaved,
  canUndo,
  onUndo,
  variantNames,
  loadVariant,
  languageDefaults,
  onImport,
  uiLang,
  onUiLangChange,
}: {
  cv: CV;
  dataName: string;
  dirty: boolean;
  editMode: boolean;
  onEditModeChange: (next: boolean) => void;
  onSaved: (savedCv: CV) => void;
  canUndo: boolean;
  onUndo: () => void;
  variantNames: string[];
  loadVariant: (name: string) => CV;
  languageDefaults: Record<Lang, Pick<CV, 'locale' | 'labels'>>;
  /** Applies a change to the open CV as one undoable step. */
  onImport: (update: (prev: CV) => CV) => void;
  uiLang: UiLang;
  onUiLangChange: (next: UiLang) => void;
}) {
  const t = useT();
  const { pos, onPointerDown } = useDraggable();
  const otherUiLang = UI_LANGS.find((l) => l !== uiLang) ?? uiLang;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importAvailable, setImportAvailable] = useState<boolean | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [importing, setImporting] = useState<{ fileName: string; done: ImportDone } | null>(null);
  const importAbort = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Other-language files written by earlier imports; the bundled copy is stale until a reload.
  const importedTwins = useRef<Record<string, CV>>({});
  const { base, lang } = parseVariant(dataName);

  useEffect(() => {
    void fetchImportAvailable().then(setImportAvailable);
  }, []);

  const canImport = importAvailable === true && !busy;

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 20000);
    return () => window.clearTimeout(timer);
  }, [note]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  // Dragging a file over the button; only files count (not selected text or page elements).
  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragOver(canImport);
  };

  // Claude returns the CV in both languages: the open one is merged as an undoable edit, its
  // twin in the other language is merged into its file and saved right away.
  const importCv = async (file: File) => {
    setBusy(true);
    setError(null);
    setNote(null);
    const abort = new AbortController();
    importAbort.current = abort;
    setImporting({ fileName: file.name, done: {} });
    const markDone = (step: ImportStep) => setImporting((s) => s && { ...s, done: { ...s.done, [step]: true } });
    try {
      const imported = await importCvFile(
        file,
        (event) => markDone(event.type === 'start' ? 'upload' : event.type === 'text' ? 'text' : event.lang),
        abort.signal,
      );
      const openLang: Lang = lang ?? (cv.locale.toLowerCase().startsWith('pl') ? 'pl' : 'en');
      onImport((prev) => mergeCv(prev, imported[openLang]));
      const other = LANGS.find((l) => l !== lang);
      setNote(
        `${importSummary(imported[openLang], cv.labels, t)}\n${
          lang && other ? t.importSaveHint(lang.toUpperCase(), other.toUpperCase()) : t.importSaveHintSingle
        }`,
      );
      if (lang && other) {
        const otherName = variantName(base, other);
        const current =
          importedTwins.current[otherName] ??
          (variantNames.includes(otherName) ? loadVariant(otherName) : { ...cv, ...languageDefaults[other] });
        const merged = mergeCv(current, imported[other]);
        await saveVariant(otherName, merged);
        importedTwins.current[otherName] = merged;
        markDone('save');
      }
    } catch (err) {
      if (!abort.signal.aborted) setError(t.importFailed(errorText(err))); // cancelling is not an error
    } finally {
      importAbort.current = null;
      setImporting(null);
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveVariant(dataName, cv);
      onSaved(cv);
      setNote(null); // the "click Save" hint after an import is done
      setJustSaved(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const switchLang = async (target: Lang) => {
    if (target === lang) return;
    const name = variantName(base, target);
    if (dirty && !window.confirm(t.discardAndSwitchLang)) return;
    if (variantNames.includes(name)) return goToVariant(name);
    const label = target.toUpperCase();
    if (!window.confirm(t.createLangVersion(base, label))) return;
    setBusy(true);
    setError(null);
    try {
      await saveVariant(name, { ...cv, ...languageDefaults[target] });
      goToVariant(name);
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
    }
  };

  const style: CSSProperties | undefined = pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined;

  return (
    <div className="toolbar" style={style}>
      <span className="toolbar-handle" onPointerDown={onPointerDown} aria-hidden="true">
        ⠿
      </span>
      <FileMenu cv={cv} dataName={dataName} dirty={dirty} variantNames={variantNames} />
      <span className="toolbar-divider" />
      <div className="segmented" role="group" aria-label={t.mode}>
        <button
          type="button"
          className={editMode ? undefined : 'active'}
          aria-pressed={!editMode}
          onClick={() => onEditModeChange(false)}
        >
          {t.preview}
        </button>
        <button
          type="button"
          className={editMode ? 'active' : undefined}
          aria-pressed={editMode}
          onClick={() => onEditModeChange(true)}
        >
          {t.edit}
        </button>
      </div>
      <div className="segmented" role="group" aria-label={t.cvLanguage}>
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            className={l === lang ? 'active' : undefined}
            aria-pressed={l === lang}
            onClick={() => void switchLang(l)}
            disabled={busy}
            title={variantNames.includes(variantName(base, l)) ? undefined : t.missingLangVersion(l.toUpperCase())}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <span className="toolbar-divider" />
      {editMode && (
        <button type="button" className="tb-btn" onClick={onUndo} disabled={!canUndo} title={t.undoTitle}>
          {UNDO_ICON}
          {t.undo}
        </button>
      )}
      <button
        type="button"
        className={dirty ? 'tb-btn attention' : justSaved ? 'tb-btn saved' : 'tb-btn'}
        onClick={() => void save()}
        disabled={!dirty || busy}
        title={dirty ? t.saveTitle(base) : t.nothingToSave}
      >
        {justSaved && !dirty ? CHECK_ICON : SAVE_ICON}
        {justSaved && !dirty ? t.saved : t.save}
        {dirty && <span className="dirty-dot" aria-label={t.unsaved} />}
      </button>
      <span
        className={dragOver ? 'tb-tip drag-over' : 'tb-tip'}
        tabIndex={importAvailable === false ? 0 : undefined}
        aria-describedby="import-cv-tip"
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault(); // otherwise the browser opens the dropped file
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file && canImport) void importCv(file);
        }}
      >
        <button type="button" className="tb-btn" onClick={() => fileInputRef.current?.click()} disabled={!canImport}>
          {UPLOAD_ICON}
          {busy ? t.importing : dragOver ? t.importDrop : t.importCv}
        </button>
        <span className="tb-tip-bubble" id="import-cv-tip" role="tooltip">
          {importAvailable === false ? t.importUnavailable : t.importTip}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // lets the same file be picked again
            if (file) void importCv(file);
          }}
        />
      </span>
      <a
        className="tb-btn primary"
        href={`/__cv-pdf?data=${encodeURIComponent(dataName)}`}
        title={t.pdfTitle}
        onClick={(e) => {
          if (dirty && !window.confirm(t.pdfUnsaved)) {
            e.preventDefault();
          }
        }}
      >
        {DOWNLOAD_ICON}
        PDF
      </a>
      <span className="toolbar-divider" />
      <button
        type="button"
        className="flag-btn"
        onClick={() => onUiLangChange(otherUiLang)}
        aria-label={t.switchInterfaceTo}
        title={t.switchInterfaceTo}
      >
        {FLAGS[otherUiLang]}
      </button>
      {error && <span className="toolbar-error">{error}</span>}
      {importing && (
        <ImportDialog
          fileName={importing.fileName}
          done={importing.done}
          withSave={lang !== null}
          onCancel={() => importAbort.current?.abort()}
        />
      )}
      {note && (
        <div className="toolbar-note" role="status">
          {note}
        </div>
      )}
    </div>
  );
}
