import BrandIcon from "./BrandIcon";

interface Props<K extends string> {
  label: string;
  allLabel: string;
  counts: Map<K, number>;
  selected: K[];
  onChange: (next: K[]) => void;
  name: (key: K) => string;
  icon?: (key: K) => string | null;
}

/** One row of multi-select filter chips. Options without matches are hidden unless selected. */
export default function FilterRow<K extends string>({ label, allLabel, counts, selected, onChange, name, icon }: Props<K>) {
  const toggle = (key: K) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <div className="filter-row">
      <span className="filter-row__label">{label}</span>
      <div className="filter-row__chips">
        <button type="button" className="chip" aria-pressed={selected.length === 0} onClick={() => onChange([])}>
          {allLabel}
        </button>
        {[...counts]
          .filter(([key, count]) => count > 0 || selected.includes(key))
          .map(([key, count]) => {
            const path = icon?.(key);
            return (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={selected.includes(key)}
                onClick={() => toggle(key)}
              >
                {path && <BrandIcon path={path} />}
                {name(key)}
                <span className="chip__count">{count}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
