import { useTranslation } from 'react-i18next';
import ReasonPicker from '@/components/ReasonPicker';
import type { ReasonValue } from '@/lib/reasons';

type ReasonFieldProps = {
  /** `reject` or `suspend` — decides the reasons offered, the label and the id of the field. */
  kind: 'reject' | 'suspend';
  value: ReasonValue;
  error?: string;
  onChange: (value: ReasonValue) => void;
};

/**
 * The reason an Admin must give before rejecting an application or suspending a stall: ticked reasons plus a note, sent
 * as the one sentence the Farmer reads back (`composeReason`). One component for both so the two dialogs ask the same
 * way.
 */
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
