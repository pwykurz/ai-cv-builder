import { useEffect, useRef, useState, type ElementType, type FocusEvent } from 'react';
import { type ItemKind, useT } from '../i18n/ui-strings';
import { useEditMode } from './edit-mode';
import { noBreak } from './no-break';

// Placeholder text of a block that was just added; the Editable that mounts with exactly this
// value takes focus once. Module-level because it only has to survive one render.
let pendingFocus: string | null = null;

export function focusOnMount(placeholder: string) {
  pendingFocus = placeholder;
}

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
  const editMode = useEditMode();
  if (!editMode) return null;
  return (
    <button type="button" className={className ? `add-btn ${className}` : 'add-btn'} onClick={onClick}>
      + {t.add} {t.items[item]}
      {suffix ? ` (${suffix})` : ''}
    </button>
  );
}

export function Editable({
  value,
  onChange,
  as: Tag = 'span',
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  as?: ElementType;
  className?: string;
}) {
  const editMode = useEditMode();
  const ref = useRef<HTMLElement>(null);

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
      key={value}
      className={editMode ? (className ? `editable ${className}` : 'editable') : className}
      contentEditable={editMode}
      suppressContentEditableWarning={editMode}
      onBlur={
        editMode
          ? (e: FocusEvent<HTMLElement>) => {
              const next = e.currentTarget.textContent ?? '';
              if (next !== value) onChange(next);
            }
          : undefined
      }
    >
      {noBreak(value)}
    </Tag>
  );
}

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
  as?: ElementType;
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

function moveItem<T>(items: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= items.length) return items;
  const next = items.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function listControls<T>(items: T[], i: number, onChange: (next: T[]) => void) {
  return {
    onUp: i > 0 ? () => onChange(moveItem(items, i, -1)) : undefined,
    onDown: i < items.length - 1 ? () => onChange(moveItem(items, i, 1)) : undefined,
    onRemove: () => onChange(items.filter((_, j) => j !== i)),
  };
}

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
  const editMode = useEditMode();
  if (!editMode) return null;
  const label = t.items[item];
  return (
    <span className={block ? 'item-controls block' : 'item-controls'}>
      <button
        type="button"
        className="ctl-btn"
        onClick={onUp}
        disabled={!onUp}
        aria-label={`${t.moveUp}: ${label}`}
        title={t.moveUp}
      >
        ↑
      </button>
      <button
        type="button"
        className="ctl-btn"
        onClick={onDown}
        disabled={!onDown}
        aria-label={`${t.moveDown}: ${label}`}
        title={t.moveDown}
      >
        ↓
      </button>
      <button
        type="button"
        className="ctl-btn remove"
        onClick={onRemove}
        aria-label={`${t.remove}: ${label}`}
        title={t.remove}
      >
        ×
      </button>
    </span>
  );
}

const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

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
      const res = await fetch('/__upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      const { path } = (await res.json()) as { path: string };
      onChange(path);
    } catch (err) {
      window.alert(t.photoUploadFailed(err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
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
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
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
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

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
  const editMode = useEditMode();
  if (!editMode) return null;
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
