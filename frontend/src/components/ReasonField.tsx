import { useTranslation } from 'react-i18next';
import ReasonPicker from '@/components/ReasonPicker';
import type { ReasonValue } from '@/lib/reasons';

type ReasonFieldProps = {
  kind: 'reject' | 'suspend';
  value: ReasonValue;
  error?: string;
  onChange: (value: ReasonValue) => void;
};

export function ReasonField({ kind, value, error, onChange }: ReasonFieldProps) {
  const { t } = useTranslation('AdminFarmers');
  return (
    <ReasonPicker
      id={`${kind}-reason`}
      kind={kind}
      label={t(`${kind}.reason`)}
      required
      value={value}
      onChange={onChange}
      error={error}
      notePlaceholder={t(`${kind}.placeholder`)}
    />
  );
}
