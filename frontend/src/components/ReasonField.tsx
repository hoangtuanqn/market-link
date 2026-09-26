import { useTranslation } from 'react-i18next';
import { REASON_MAX } from '@/constants/approvalStatus';

type ReasonFieldProps = {
  /** `reject` or `suspend` — decides the label text, the hint and the id of the field. */
  kind: 'reject' | 'suspend';
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

/**
 * The reason an Admin must write before rejecting an application or suspending a stall. No preset list because the
 * recipient reads back exactly this sentence. One component for both so the two dialogs ask the same way.
 */
export function ReasonField({ kind, value, error, onChange }: ReasonFieldProps) {
  const { t } = useTranslation('AdminFarmers');
  const id = `${kind}-reason`;
  const used = value.trim().length;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {t(`${kind}.reason`)}
        <span aria-hidden="true" className="text-danger ml-0.5">
          *
        </span>
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(`${kind}.placeholder`)}
        aria-invalid={!!error}
        aria-describedby={`${id}-note`}
        className={`bg-surface-raised text-body min-h-20 rounded-sm border-[1.5px] p-3 ${
          error ? 'border-danger' : 'border-line-strong'
        }`}
      />
      <span
        id={`${id}-note`}
        role={error ? 'alert' : undefined}
        className={`text-[13px] ${error ? 'text-danger' : 'text-ink-muted'}`}
      >
        {error ?? t(`${kind}.hint`, { used, max: REASON_MAX })}
      </span>
    </div>
  );
}

export default ReasonField;
