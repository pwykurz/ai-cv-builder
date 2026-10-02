import { EditableList } from '../editing';

export function Tech({
  label,
  items,
  onChange,
}: {
  label: string;
  items?: string[];
  onChange: (items: string[]) => void;
}) {
  if (!items?.length) return null;
  return (
    <p className="tech">
      <strong>{label}:</strong> <EditableList items={items} onChange={onChange} separator=", " />
    </p>
  );
}
