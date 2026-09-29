import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/chip';
import { REASON_MAX } from '@/constants/approvalStatus';
import {
  REASON_CODES,
  composeReason,
  reasonLabel,
  toggleReason,
  type ReasonKind,
  type ReasonValue,
} from '@/lib/reasons';

type ReasonPickerProps = {
  id: string;
  kind: ReasonKind;
  label: string;
  value: ReasonValue;
  onChange: (next: ReasonValue) => void;
  required?: boolean;
  error?: string;
  notePlaceholder?: string;
};

export default function ReasonPicker({
  id,
  kind,
  label,
  value,
  onChange,
  required,
  error,
  notePlaceholder,
}: ReasonPickerProps) {
  const { t } = useTranslation();
  const text = composeReason(kind, value);
  const noteId = `${id}-note`;
  const lineId = `${id}-line`;

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={lineId}>
      <legend className="text-small text-ink mb-1 p-0 font-bold">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        )}
      </legend>
      <div role="group" aria-label={t('reasons.pick')} className="flex flex-wrap gap-2">
        {REASON_CODES[kind].map((code) => (
          <Chip
            key={code}
            pressed={value.codes.includes(code)}
            onClick={() => onChange(toggleReason(value, code))}
            className="h-auto py-1.5 text-left whitespace-normal"
          >
            {reasonLabel(kind, code)}
          </Chip>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="text-small text-ink font-bold">
          {required ? t('reasons.note') : t('reasons.noteOptional')}
        </label>
        <textarea
          id={noteId}
          rows={2}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder={notePlaceholder}
          aria-invalid={!!error}
          aria-describedby={lineId}
          className={`bg-surface-raised text-body min-h-16 rounded-sm border-[1.5px] p-3 ${
            error ? 'border-danger' : 'border-line-strong'
          }`}
        />
      </div>
      <span
        id={lineId}
        role={error ? 'alert' : undefined}
        className={`text-[13px] ${error ? 'text-danger font-bold' : 'text-ink-muted'}`}
      >
        {error ??
          (text
            ? `${t('reasons.preview', { text })} ${t('reasons.length', { used: text.length, max: REASON_MAX })}`
            : t('reasons.length', { used: 0, max: REASON_MAX }))}
      </span>
    </fieldset>
  );
}
