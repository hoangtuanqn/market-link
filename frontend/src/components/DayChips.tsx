type DayOption = { value: string; label: string; sub?: string; disabled?: boolean };

type DayChipsProps = {
  legend?: string;
  name: string;
  options: DayOption[];
  value: string;
  onChange: (value: string) => void;
};

/** Weekday pill picker (design system `.ml-days`). */
const DayChips = ({ legend, name, options, value, onChange }: DayChipsProps) => {
  return (
    <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
      {legend && <legend className="text-small mb-2 p-0 font-bold">{legend}</legend>}
      {options.map((d) => (
        <label key={d.value} className="relative">
          <input
            type="radio"
            name={name}
            value={d.value}
            checked={value === d.value}
            disabled={d.disabled}
            onChange={() => onChange(d.value)}
            className="peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            className={
              'border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-focus flex min-h-11 min-w-14 flex-col items-center justify-center rounded-full px-2.5 py-1 text-[14px] leading-[1.1] font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-checked:[&_small]:text-inherit' +
              (d.disabled ? ' bg-surface-sunken text-ink-muted line-through shadow-none' : '')
            }
          >
            {d.label}
            {d.sub && <small className="text-ink-muted text-[12px] font-normal">{d.sub}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
};

export default DayChips;
