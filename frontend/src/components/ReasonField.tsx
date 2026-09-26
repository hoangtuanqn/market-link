import { useTranslation } from 'react-i18next';
import { REASON_MAX } from '@/constants/approvalStatus';

type ReasonFieldProps = {
  /** `reject` hoặc `suspend` — quyết định chữ trên nhãn, gợi ý và id của ô. */
  kind: 'reject' | 'suspend';
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

/**
 * Lý do Admin phải viết trước khi từ chối đơn hoặc đình chỉ sạp. Không dùng danh sách chọn sẵn vì người nhận đọc lại
 * đúng câu này. Một component cho cả hai để hai hộp thoại hỏi giống hệt nhau.
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
