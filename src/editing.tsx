import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CV } from './types';

/**
 * Keeps hyphenated words ("e-commerce") and year ranges ("2021–2023") on one line.
 * A line-end break after the hyphen makes some parsers glue the word together ("ecommerce").
 */
const NO_BREAK = /(\d{4}–\d{4}|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)/g;
function nb(text: string): ReactNode {
  return text.split(NO_BREAK).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="nb">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// Whether fields are editable at all. Off by default - the page looks and behaves exactly like
// the plain static CV until the toolbar's Edit button turns this on, so nothing (contentEditable
// quirks, hover outlines, the × buttons) is ever in the way of just reading/printing the CV.
const EditModeContext = createContext(false);

export function EditModeProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

function useEditMode(): boolean {
  return useContext(EditModeContext);
}

// ---------- Interface language (toolbar and editing controls only, not the CV content) ----------
export const UI_LANGS = ['pl', 'en'] as const;
export type UiLang = (typeof UI_LANGS)[number];

/** Names of the blocks that can be added/moved/removed, used in "+ …" buttons and control labels. */
export type ItemKind = 'paragraph' | 'skillGroup' | 'job' | 'project' | 'bullet' | 'education';

const UI = {
  pl: {
    switchInterfaceTo: 'Przełącz interfejs na angielski',
    preview: 'Podgląd',
    edit: 'Edycja',
    mode: 'Tryb',
    cvLanguage: 'Język CV',
    undo: 'Cofnij',
    undoTitle: 'Cofnij ostatnią zmianę (Ctrl+Z)',
    save: 'Zapisz',
    saveTitle: (name: string) => `Zapisz zmiany w „${name}”`,
    nothingToSave: 'Brak zmian do zapisania',
    unsaved: 'niezapisane zmiany',
    pdfTitle: 'Pobierz PDF (ostatnia zapisana wersja)',
    pdfUnsaved: 'Masz niezapisane zmiany - PDF powstanie z ostatniej zapisanej wersji. Pobrać mimo to?',
    pickVariant: 'Wybierz wariant CV',
    variants: 'Warianty CV',
    duplicateAs: 'Duplikuj jako…',
    duplicatePrefix: 'Duplikuj',
    duplicateSuffix: 'jako',
    newVariantName: 'Nazwa nowego wariantu',
    cancel: 'Anuluj',
    create: 'Utwórz',
    removeVariant: (name: string) => `Usuń „${name}”`,
    protectedHint: 'chronione',
    protectedTitle: 'Bazowe CV jest chronione',
    badName: 'Dozwolone: litery, cyfry, kropka, myślnik, podkreślnik.',
    nameTaken: (name: string) => `„${name}” już istnieje - wybierz inną nazwę.`,
    discardAndOpen: (name: string) => `Masz niezapisane zmiany. Odrzucić je i otworzyć „${name}”?`,
    confirmDelete: (name: string, lang: string) => `Usunąć „${name}” (wersja ${lang})? Tego nie da się cofnąć.`,
    discardAndSwitchLang: 'Masz niezapisane zmiany. Odrzucić je i przełączyć język?',
    createLangVersion: (name: string, lang: string) =>
      `„${name}” nie ma jeszcze wersji ${lang}. Utworzyć ją jako kopię obecnej treści (z nagłówkami ${lang}) do przetłumaczenia?`,
    missingLangVersion: (lang: string) => `Brak wersji ${lang} - kliknij, aby utworzyć`,
    changePhoto: 'Zmień zdjęcie',
    addPhoto: 'Dodaj zdjęcie',
    uploading: 'Wysyłanie…',
    photoUploadFailed: (reason: string) => `Nie udało się wgrać zdjęcia: ${reason}`,
    moveUp: 'Przesuń wyżej',
    moveDown: 'Przesuń niżej',
    remove: 'Usuń',
    present: 'obecnie',
    items: {
      paragraph: 'akapit',
      skillGroup: 'grupę skilli',
      job: 'stanowisko',
      project: 'projekt',
      bullet: 'punkt',
      education: 'wpis edukacji',
    } satisfies Record<ItemKind, string>,
  },
  en: {
    switchInterfaceTo: 'Switch interface to Polish',
    preview: 'Preview',
    edit: 'Edit',
    mode: 'Mode',
    cvLanguage: 'CV language',
    undo: 'Undo',
    undoTitle: 'Undo the last change (Ctrl+Z)',
    save: 'Save',
    saveTitle: (name: string) => `Save changes to "${name}"`,
    nothingToSave: 'Nothing to save',
    unsaved: 'unsaved changes',
    pdfTitle: 'Download PDF (last saved version)',
    pdfUnsaved: 'You have unsaved changes - the PDF will use the last saved version. Download anyway?',
    pickVariant: 'Choose a CV variant',
    variants: 'CV variants',
    duplicateAs: 'Duplicate as…',
    duplicatePrefix: 'Duplicate',
    duplicateSuffix: 'as',
    newVariantName: 'New variant name',
    cancel: 'Cancel',
    create: 'Create',
    removeVariant: (name: string) => `Delete "${name}"`,
    protectedHint: 'protected',
    protectedTitle: 'The base CV is protected',
    badName: 'Allowed: letters, digits, dot, hyphen, underscore.',
    nameTaken: (name: string) => `"${name}" already exists - pick another name.`,
    discardAndOpen: (name: string) => `You have unsaved changes. Discard them and open "${name}"?`,
    confirmDelete: (name: string, lang: string) => `Delete "${name}" (${lang} version)? This can't be undone.`,
    discardAndSwitchLang: 'You have unsaved changes. Discard them and switch language?',
    createLangVersion: (name: string, lang: string) =>
      `"${name}" has no ${lang} version yet. Create it as a copy of the current content (with ${lang} headings) to translate?`,
    missingLangVersion: (lang: string) => `No ${lang} version - click to create it`,
    changePhoto: 'Change photo',
    addPhoto: 'Add photo',
    uploading: 'Uploading…',
    photoUploadFailed: (reason: string) => `Couldn't upload the photo: ${reason}`,
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Delete',
    present: 'present',
    items: {
      paragraph: 'paragraph',
      skillGroup: 'skill group',
      job: 'position',
      project: 'project',
      bullet: 'bullet point',
      education: 'education entry',
    } satisfies Record<ItemKind, string>,
  },
};

export type UiStrings = (typeof UI)[UiLang];

const UiLangContext = createContext<UiLang>('en');

export function UiLangProvider({ value, children }: { value: UiLang; children: ReactNode }) {
  return <UiLangContext.Provider value={value}>{children}</UiLangContext.Provider>;
}

/** Interface strings in the current interface language. */
export function useT(): UiStrings {
  return UI[useContext(UiLangContext)];
}

const UI_LANG_KEY = 'cv-builder.uiLang';

/** The last interface language picked in this browser (a per-viewer convenience, so it lives in
 * localStorage; defaults to English when nothing is stored or storage is unavailable). */
export function loadUiLang(): UiLang {
  try {
    const stored = window.localStorage.getItem(UI_LANG_KEY);
    return stored === 'en' || stored === 'pl' ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function storeUiLang(lang: UiLang) {
  try {
    window.localStorage.setItem(UI_LANG_KEY, lang);
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }
}

// Placeholder text of a block that was just added; the Editable that mounts with exactly this
// value takes focus once. Module-level because it only has to survive one render.
let pendingFocus: string | null = null;

export function focusOnMount(placeholder: string) {
  pendingFocus = placeholder;
}

/**
 * "+ …" add control, only rendered in edit mode (hidden in print). Lives at the end (or, for
 * dated lists that are newest-first, the start) of the list it adds to.
 */
export function AddButton({
  item,
  suffix,
  onClick,
  className,
}: {
  item: ItemKind;
  /** Extra context after the item name, e.g. the "Key projects" heading. */
  suffix?: string;
  onClick: () => void;
  className?: string;
}) {
  const t = useT();
  if (!useEditMode()) return null;
  return (
    <button type="button" className={className ? `add-btn ${className}` : 'add-btn'} onClick={onClick}>
      + {t.items[item]}
      {suffix ? ` (${suffix})` : ''}
    </button>
  );
}

/**
 * A single editable piece of text. Renders `nb(value)` (same no-break protection as the static
 * render used to have) so the appearance when edit mode is off - including anything Playwright
 * captures for the official PDF, which never turns edit mode on - is byte-for-byte the same as
 * before this feature existed. Only commits on blur, via plain textContent (never innerHTML), so
 * typed/pasted content can never become rich markup.
 */
export function Editable({
  value,
  onChange,
  as = 'span',
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}) {
  const editMode = useEditMode();
  const Tag = as as any;
  const ref = useRef<HTMLElement>(null);

  // A freshly added block asks for its first field to be focused with the placeholder text
  // selected, so you can type over it straight away (see focusOnMount). Keyed on `value`, not
  // just mount: inserting at the top of a list reuses the existing components (lists are keyed
  // by index) and only shifts values into them.
  useEffect(() => {
    const el = ref.current;
    if (!editMode || !el || pendingFocus === null || value !== pendingFocus) return;
    pendingFocus = null;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editMode, value]);

  return (
    <Tag
      ref={ref}
      // Remount whenever the value changes (commit or undo): the browser rewrites a
      // contentEditable's DOM while typing, so patching it in place could hit nodes React no
      // longer owns.
      key={value}
      className={editMode ? (className ? `editable ${className}` : 'editable') : className}
      contentEditable={editMode}
      suppressContentEditableWarning={editMode}
      onBlur={
        editMode
          ? (e: React.FocusEvent<HTMLElement>) => {
              const next = e.currentTarget.textContent ?? '';
              if (next !== value) onChange(next);
            }
          : undefined
      }
    >
      {nb(value)}
    </Tag>
  );
}

/**
 * For fields that are a string[] in the data but render as one joined line (skills, tech
 * stacks, links, languages). Editing is just editing that joined text - splitting it back on
 * `separator` also covers "removing one item" without a dedicated per-item control.
 */
export function EditableList({
  items,
  onChange,
  separator = ', ',
  as = 'span',
  className,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  separator?: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}) {
  const splitChar = separator.trim() || separator;
  return (
    <Editable
      value={items.join(separator)}
      onChange={(text) =>
        onChange(
          text
            .split(splitChar)
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
      as={as}
      className={className}
    />
  );
}

/** Swaps item `i` with its neighbour above (-1) or below (+1); out of range is a no-op. */
function moveItem<T>(items: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= items.length) return items;
  const next = items.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Handlers for one entry of a list: move up/down (absent at the ends) and remove. */
export function listControls<T>(items: T[], i: number, onChange: (next: T[]) => void) {
  return {
    onUp: i > 0 ? () => onChange(moveItem(items, i, -1)) : undefined,
    onDown: i < items.length - 1 ? () => onChange(moveItem(items, i, 1)) : undefined,
    onRemove: () => onChange(items.filter((_, j) => j !== i)),
  };
}

/**
 * ↑ ↓ × for one list entry, only rendered in edit mode. `block` pins the group to the top-right
 * corner of a card-like container (job/project, both `position: relative`); otherwise it sits
 * inline right after the entry's text (bullets, paragraphs, skill groups, education rows).
 * Moving is one step at a time - precise, keyboard-reachable, and every step is undoable.
 */
export function ItemControls({
  item,
  onUp,
  onDown,
  onRemove,
  block,
}: {
  item: ItemKind;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  block?: boolean;
}) {
  const t = useT();
  if (!useEditMode()) return null;
  const label = t.items[item];
  return (
    <span className={block ? 'item-controls block' : 'item-controls'}>
      <button type="button" className="ctl-btn" onClick={onUp} disabled={!onUp} aria-label={`${t.moveUp}: ${label}`} title={t.moveUp}>
        ↑
      </button>
      <button type="button" className="ctl-btn" onClick={onDown} disabled={!onDown} aria-label={`${t.moveDown}: ${label}`} title={t.moveDown}>
        ↓
      </button>
      <button type="button" className="ctl-btn remove" onClick={onRemove} aria-label={`${t.remove}: ${label}`} title={t.remove}>
        ×
      </button>
    </span>
  );
}

const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * The profile photo. Outside edit mode it's exactly the plain <img> it always was (or nothing
 * when there's no photo). In edit mode it gets a hover overlay - "Change photo", or an empty
 * "Add photo" slot - that opens a file picker; the file goes to the dev-server upload endpoint
 * (vite.config.ts) and the returned path is set like any other edit (dirty, undoable).
 */
export function PhotoEditor({ src, onChange }: { src: string | null; onChange: (path: string) => void }) {
  const editMode = useEditMode();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!editMode) return src ? <img className="photo" src={src} alt="" /> : null;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch('/__upload-photo', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error(await res.text());
      const { path } = (await res.json()) as { path: string };
      onChange(path);
    } catch (err) {
      window.alert(t.photoUploadFailed(err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      // The button keeps focus after the file dialog closes, which would pin the overlay open.
      buttonRef.current?.blur();
    }
  };

  return (
    <div className={src ? 'photo-slot' : 'photo-slot empty'}>
      {src && <img className="photo" src={src} alt="" />}
      <button
        ref={buttonRef}
        type="button"
        className={uploading ? 'photo-overlay busy' : 'photo-overlay'}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <span>{uploading ? t.uploading : src ? t.changePhoto : t.addPhoto}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // so picking the same file again still fires onChange
          if (file) upload(file);
        }}
      />
    </div>
  );
}

/**
 * Structured date editing (two <input type="month">, format "YYYY-MM" matches the data 1:1,
 * plus an optional "Present" checkbox), only rendered in edit mode. Free-text editing of the
 * *formatted* date ("Jun 2021") can't be parsed back reliably, so dates are the one field that
 * isn't a plain `Editable` - this sits next to the existing formatted `.dates` span, which still
 * renders normally for print/PDF (and whenever edit mode is off).
 */
export function DateRange({
  start,
  end,
  allowPresent = false,
  onChange,
}: {
  start: string;
  end: string | null;
  allowPresent?: boolean;
  onChange: (next: { start: string; end: string | null }) => void;
}) {
  const t = useT();
  if (!useEditMode()) return null;
  return (
    <span className="date-edit">
      <input type="month" value={start} onChange={(e) => onChange({ start: e.target.value, end })} />
      <span className="date-edit-sep">–</span>
      {end === null ? (
        <span className="date-edit-present">{t.present}</span>
      ) : (
        <input type="month" value={end} onChange={(e) => onChange({ start, end: e.target.value })} />
      )}
      {allowPresent && (
        <label className="date-edit-toggle">
          <input
            type="checkbox"
            checked={end === null}
            onChange={(e) => onChange({ start, end: e.target.checked ? null : start })}
          />
          {t.present}
        </label>
      )}
    </span>
  );
}

/** Drag tracking for the floating toolbar. No external dnd library - one draggable element
 * doesn't justify the dependency. `pos` stays null (CSS default position) until first drag. */
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



// ---------- Variants & languages ----------
// Every variant exists per language as <base>.<lang>.json (cv.en.json, google.pl.json, ...) in data/ or examples/.
// "cv" is the base CV - cv.en is the default (see getDataName() in src/App.tsx) - and both of its
// language versions are undeletable (enforced again in vite.config.ts).
export const LANGS = ['pl', 'en'] as const;
export type Lang = (typeof LANGS)[number];
const BASE_VARIANT = 'cv';
const SAFE_BASE = /^[\w-]+(\.[\w-]+)*$/;

export function parseVariant(name: string): { base: string; lang: Lang | null } {
  const m = /^(.*)\.(pl|en)$/.exec(name);
  return m ? { base: m[1], lang: m[2] as Lang } : { base: name, lang: null };
}

const variantName = (base: string, lang: Lang | null) => (lang ? `${base}.${lang}` : base);

/** First free "<base>-copy", "<base>-copy-2", ... among `taken` bases, used to prefill
 * "Duplicate as…". Strips a previous "-copy"/"-copy-N" first so duplicating a duplicate doesn't
 * stack suffixes ("cv-copy-copy"). */
function suggestCloneName(base: string, taken: string[]): string {
  const root = base.replace(/-copy(-\d+)?$/, '');
  let candidate = `${root}-copy`;
  let n = 2;
  while (taken.includes(candidate)) {
    candidate = `${root}-copy-${n++}`;
  }
  return candidate;
}

function goTo(name: string) {
  window.location.href = `?data=${encodeURIComponent(name)}`;
}

async function saveVariant(name: string, cv: CV) {
  const res = await fetch(`/__save-cv?data=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cv),
  });
  if (!res.ok) throw new Error(await res.text());
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

const icon = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
// Inline SVG rather than emoji flags, which don't render on Windows and look different per font.
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

/**
 * The "which file" zone: a button showing the current variant that opens a menu with every
 * variant in the current language (✓ on the active one) plus the file-level actions -
 * "Duplicate as…" and "Delete" - so they live next to the thing they act on. A custom menu
 * rather than a native <select>, because a <select> can't hold actions and can't be styled.
 */
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
  // null = showing the menu list; a string = showing the "Duplicate as…" name form.
  const [dupName, setDupName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dupInputRef = useRef<HTMLInputElement>(null);

  const { base, lang } = parseVariant(dataName);
  const sameLang = variantNames.filter((n) => parseVariant(n).lang === lang);
  const takenBases = sameLang.map((n) => parseVariant(n).base);

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
    goTo(name);
  };

  // Duplicates the *current* state (including unsaved edits) in the current language and never
  // overwrites an existing file. A typed ".pl"/".en" suffix is ignored - the language is implied.
  const duplicate = async () => {
    const newBase = parseVariant((dupName ?? '').trim()).base;
    if (!SAFE_BASE.test(newBase)) return setError(t.badName);
    const name = variantName(newBase, lang);
    if (variantNames.includes(name)) return setError(t.nameTaken(newBase));
    setBusy(true);
    setError(null);
    try {
      await saveVariant(name, cv);
      goTo(name);
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
      goTo(variantName(BASE_VARIANT, lang ?? 'en'));
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
    }
  };

  const isProtected = base === BASE_VARIANT;

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
                <button key={name} type="button" role="menuitemradio" aria-checked={name === dataName} className="menu-item" onClick={() => switchTo(name)}>
                  <span className="check">{name === dataName ? '✓' : ''}</span>
                  {parseVariant(name).base}
                </button>
              ))}
              <div className="menu-sep" />
              <button type="button" role="menuitem" className="menu-item" onClick={() => setDupName(suggestCloneName(base, takenBases))}>
                <span className="check" />
                {t.duplicateAs}
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item danger"
                onClick={remove}
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
                duplicate();
              }}
            >
              <div className="menu-label">
                {t.duplicatePrefix} <span className="menu-label-name">{base}</span> {t.duplicateSuffix}
              </div>
              <input ref={dupInputRef} value={dupName} onChange={(e) => setDupName(e.target.value)} spellCheck={false} aria-label={t.newVariantName} />
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

/* Screen-only (hidden in @media print, see styles.css). Two zones: "which file" (FileMenu) and
   "what I'm doing" (mode + language switches, Undo, Save, PDF). Save/PDF/duplicate/delete hit
   dev-server-only endpoints (vite.config.ts) that don't exist in a static build or the PDF. */
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
  /** Section headings, "Present", date locale... per language, taken from the base cv.<lang>. */
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

  // Always saves to the variant that's open - creating a new one is "Duplicate as…" in the file menu.
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

  // Opens the same variant in the other language. If that version doesn't exist yet, offers to
  // create it from the current content with the target language's headings and date format -
  // the text itself stays as is, to be translated in edit mode.
  const switchLang = async (target: Lang) => {
    if (target === lang) return;
    const name = variantName(base, target);
    if (dirty && !window.confirm(t.discardAndSwitchLang)) return;
    if (variantNames.includes(name)) return goTo(name);
    const label = target.toUpperCase();
    if (!window.confirm(t.createLangVersion(base, label))) return;
    setBusy(true);
    setError(null);
    try {
      await saveVariant(name, { ...cv, ...languageDefaults[target] });
      goTo(name);
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
        <button type="button" className={editMode ? undefined : 'active'} aria-pressed={!editMode} onClick={() => onEditModeChange(false)}>
          {t.preview}
        </button>
        <button type="button" className={editMode ? 'active' : undefined} aria-pressed={editMode} onClick={() => onEditModeChange(true)}>
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
            onClick={() => switchLang(l)}
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
          onClick={save}
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
          // The endpoint renders the file on disk, so unsaved edits wouldn't be in the PDF.
          if (dirty && !window.confirm(t.pdfUnsaved)) {
            e.preventDefault();
          }
        }}
      >
        {DOWNLOAD_ICON}
        PDF
      </a>
      <span className="toolbar-divider" />
      {/* Only the language you'd switch TO is shown - one click, no "which one is active?". */}
      <button type="button" className="flag-btn" onClick={() => onUiLangChange(otherUiLang)} aria-label={t.switchInterfaceTo} title={t.switchInterfaceTo}>
        {FLAGS[otherUiLang]}
      </button>
      {error && <span className="toolbar-error">{error}</span>}
    </div>
  );
}
