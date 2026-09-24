type SlotOption = { value: string; time: string; booked: number; max: number };

type SlotPickerProps = {
  legend?: string;
  name: string;
  slots: SlotOption[];
  value: string | null;
  onChange: (value: string) => void;
};

/** Pickup time-window picker (design system `.ml-slots`). */
const SlotPicker = ({ legend, name, slots, value, onChange }: SlotPickerProps) => {
  return (
    <fieldset className="m-0 grid max-w-150 grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2 border-0 p-0">
      {legend && <legend className="text-small mb-2 p-0 font-bold">{legend}</legend>}
      {slots.map((s) => {
        const full = s.booked >= s.max;
        return (
          <label key={s.value} className="relative">
            <input
              type="radio"
              name={name}
              value={s.value}
              checked={value === s.value}
              disabled={full}
              onChange={() => onChange(s.value)}
              className="peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <span
              className={
                'bg-surface-raised peer-checked:bg-brand-tint peer-focus-visible:outline-focus flex flex-col gap-0.5 rounded-sm px-3 py-2.5 shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-[inset_0_0_0_2.5px_var(--brand)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2' +
                (full ? ' bg-surface-sunken text-ink-muted shadow-none' : '')
              }
            >
              <b
                className={
                  'font-hand text-[21px] leading-[1.15] font-normal tabular-nums' + (full ? ' line-through' : '')
                }
              >
                {s.time}
              </b>
              <small className="text-ink-muted text-[12px]">
                {full ? 'Fully booked' : `${s.max - s.booked} of ${s.max} left`}
              </small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};

export default SlotPicker;
