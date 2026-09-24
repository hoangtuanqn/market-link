import { units } from '@/lib/format';

type QtyStepperProps = {
  value: number;
  max: number;
  unit: string;
  min?: number;
  onChange: (value: number) => void;
};

/** Plus/minus stepper with the stock left underneath (design system `.ml-qty`). */
const QtyStepper = ({ value, max, unit, min = 1, onChange }: QtyStepperProps) => {
  const note = value >= max ? `Max ${units(max, unit)}` : `${units(max - value, unit)} left`;

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span
        role="group"
        aria-label={`Quantity ${unit}`}
        className="border-line-strong bg-surface-raised inline-flex items-center rounded-sm border-[1.5px]"
      >
        <button
          type="button"
          aria-label="Decrease by 1"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="disabled:text-line-strong grid size-10 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
        >
          −
        </button>
        <output aria-live="polite" className="min-w-10 text-center font-bold tabular-nums">
          {value}
        </output>
        <button
          type="button"
          aria-label="Increase by 1"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="disabled:text-line-strong grid size-10 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
        >
          +
        </button>
      </span>
      <span className="text-ink-muted text-[12px]">{note}</span>
    </span>
  );
};

export default QtyStepper;
