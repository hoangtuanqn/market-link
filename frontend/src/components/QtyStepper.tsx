import { useTranslation } from 'react-i18next';
import { unitName, units } from '@/lib/format';

type QtyStepperProps = {
  value: number;
  max: number;
  unit: string;
  plural?: string;
  min?: number;
  onChange: (value: number) => void;
};

/** Plus/minus stepper with the stock left underneath (design system `.ml-qty`). */
const QtyStepper = ({ value, max, unit, plural, min = 1, onChange }: QtyStepperProps) => {
  const { t } = useTranslation();
  const note =
    value >= max
      ? t('qty.max', { qty: units(max, unit, plural) })
      : t('qty.left', { qty: units(max - value, unit, plural) });

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span
        role="group"
        aria-label={t('qty.label', { unit: unitName(unit) })}
        className="border-line-strong bg-surface-raised inline-flex items-center rounded-sm border-[1.5px]"
      >
        <button
          type="button"
          aria-label={t('qty.decrease')}
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
          aria-label={t('qty.increase')}
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
