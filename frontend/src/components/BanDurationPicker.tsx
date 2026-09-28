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
 * `<input type="datetime-local">` always reads/writes the _viewer's local_ wall clock, but an ISO string's own
 * `.slice(0, 16)` is UTC — using that directly shows (and, worse, floors `min` to) a time that is wrong by the viewer's
 * UTC offset. Shift by the local timezone offset first so the input's value is the correct local wall-clock reading of
 * the same instant.
 */
const toLocalInputValue = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/**
 * FR-072: permanent vs. temporary deactivation. Temporary starts from a sensible 7-day default the moment it is
 * selected (never an invalid past value), with quick-pick day buttons plus a free datetime field for an exact end
 * time.
 */
export default function BanDurationPicker({ value, onChange }: BanDurationPickerProps) {
  const { t } = useTranslation();
  const isTemporary = value.kind === 'temporary';
  // Computed once on mount, not on every render — Date.now() is impure and React forbids calling it during render.
  const [minUntil] = useState(() => toLocalInputValue(new Date(Date.now() + 60_000).toISOString()));

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
            value={toLocalInputValue(value.until)}
            onChange={(e) => {
              const picked = e.target.value ? new Date(e.target.value) : null;
              if (!picked || Number.isNaN(picked.getTime())) return;
              onChange({ kind: 'temporary', until: picked.toISOString() });
            }}
          />
        </div>
      )}
    </fieldset>
  );
}
