import { AddButton, Editable, ItemControls, focusOnMount, listControls } from '../editing';
import { NEW_ITEM } from './placeholders';

export function Bullets({
  items = [],
  onChange,
  listKey,
}: {
  items?: string[];
  onChange: (items: string[]) => void;
  /** Parent item id — stabilises React keys when bullets are reordered. */
  listKey: string;
}) {
  const add = () => {
    focusOnMount(NEW_ITEM.bullet);
    onChange([...items, NEW_ITEM.bullet]);
  };

  return (
    <>
      {items.length > 0 && (
        <ul>
          {items.map((item, i) => (
            // Flex row on an inner span — display:flex on <li> drops the list marker.
            <li key={`${listKey}-b-${i}`}>
              <span className="editable-row">
                <Editable value={item} onChange={(v) => onChange(items.map((it, j) => (j === i ? v : it)))} as="span" />
                <ItemControls item="bullet" {...listControls(items, i, onChange)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddButton item="bullet" className="add-bullet" onClick={add} />
    </>
  );
}
