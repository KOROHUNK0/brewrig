export interface SegOption<K extends string> {
  value: K;
  label: string;
}
interface Props<K extends string> {
  options: SegOption<K>[];
  value: K;
  onChange(v: K): void;
  disabled?: boolean;
}
export function SegSlider<K extends string>({
  options,
  value,
  onChange,
  disabled,
}: Props<K>) {
  const i = options.findIndex((o) => o.value === value);
  const len = options.length;
  // The original bundle uses literal newlines inside calc() — producing
  // syntactically invalid CSS that browsers drop, leaving the thumb with
  // no width/left. The active-button outline alone provides the visible
  // highlight. We reproduce the same value so the visual output matches.
  const leftCalc = `calc(${i} * (100%\n${len}) + 2px)`;
  const widthCalc = `calc(100%\n${len} - 4px)`;
  return (
    <div className={`seg-slider ${disabled ? 'seg-disabled' : ''}`}>
      <div className="seg-track">
        <div
          className="seg-thumb"
          style={{ left: leftCalc, width: widthCalc }}
        />
        {options.map((o) => (
          <button
            key={o.value}
            className={`seg-btn ${value === o.value ? 'active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
