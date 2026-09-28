import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/input';

export type BanDuration = { kind: 'permanent' } | { kind: 'temporary'; until: string };

type BanDurationPickerProps = {
  value: BanDuration;
  onChange: (next: BanDuration) => void;
};

const QUICK_DAYS = [1, 3, 7, 30] as const;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * FR-072: permanent vs. temporary deactivation. Temporary starts from a sensible 7-day default the moment it is
 * selected (never an invalid past value), with quick-pick day buttons plus a free datetime field for an exact end
 * time.
 */
export default function BanDurationPicker({ value, onChange }: BanDurationPickerProps) {
  const { t } = useTranslation();
  const isTemporary = value.kind === 'temporary';
  // Computed once on mount, not on every render — Date.now() is impure and React forbids calling it during render.
  const [minUntil] = useState(() => new Date(Date.now() + 60_000).toISOString().slice(0, 16));

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="text-small text-ink mb-1 p-0 font-bold">{t('banDuration.label')}</legend>
      <div role="radiogroup" className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            role="radio"
            name="ban-duration-kind"
            checked={!isTemporary}
            onChange={() => onChange({ kind: 'permanent' })}
          />
          {t('banDuration.permanent')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            role="radio"
            name="ban-duration-kind"
            checked={isTemporary}
            onChange={() => onChange({ kind: 'temporary', until: inDays(7) })}
          />
          {t('banDuration.temporary')}
        </label>
      </div>
      {isTemporary && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                className="ml-chip"
                onClick={() => onChange({ kind: 'temporary', until: inDays(days) })}
              >
                {t('banDuration.days', { count: days })}
              </button>
            ))}
          </div>
          <Field
            id="ban-until"
            type="datetime-local"
            label={t('banDuration.specificTime')}
            min={minUntil}
            value={value.until.slice(0, 16)}
            onChange={(e) => onChange({ kind: 'temporary', until: new Date(e.target.value).toISOString() })}
          />
        </div>
      )}
    </fieldset>
  );
}
