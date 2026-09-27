import { useTranslation } from 'react-i18next';
import { ReasonField } from '@/components/ReasonField';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ReasonValue } from '@/lib/reasons';
import type { AdminFarmerListItemType } from '@/types/farmer.types';

type RejectDialogProps = {
  target: AdminFarmerListItemType | null;
  reason: ReasonValue;
  reasonError?: string;
  onReasonChange: (next: ReasonValue) => void;
  onClose: () => void;
  onConfirm: () => void;
};

/** Rejects a registration; the reason is required because the applicant reads it back before re-applying. */
const RejectDialog = ({ target, reason, reasonError, onReasonChange, onClose, onConfirm }: RejectDialogProps) => {
  const { t } = useTranslation('AdminFarmers');
  return (
    <Dialog
      open={target !== null}
      tone="danger"
      title={target ? t('reject.title', { stall: target.stallName }) : ''}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('keepReviewing')}
          </Button>
          <Button variant="dangerFill" onClick={onConfirm}>
            {t('reject.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{t('reject.text')}</p>
        <ReasonField kind="reject" value={reason} error={reasonError} onChange={onReasonChange} />
      </div>
    </Dialog>
  );
};

export default RejectDialog;
