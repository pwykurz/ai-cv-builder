import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { UI_LANGS, useT, type UiLang } from '../i18n/ui-strings';
import type { CV } from '../types';
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
  languageDefaults,
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
  languageDefaults: Record<Lang, Pick<CV, 'locale' | 'labels'>>;
  uiLang: UiLang;
  onUiLangChange: (next: UiLang) => void;
}) {
  const t = useT();
  const { pos, onPointerDown } = useDraggable();
  const otherUiLang = UI_LANGS.find((l) => l !== uiLang) ?? uiLang;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { base, lang } = parseVariant(dataName);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveVariant(dataName, cv);
      onSaved(cv);
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
      {editMode && (
        <button
          type="button"
          className="tb-btn"
          onClick={() => void save()}
          disabled={!dirty || busy}
          title={dirty ? t.saveTitle(base) : t.nothingToSave}
        >
          {SAVE_ICON}
          {t.save}
          {dirty && <span className="dirty-dot" aria-label={t.unsaved} />}
        </button>
      )}
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
    </div>
  );
}
