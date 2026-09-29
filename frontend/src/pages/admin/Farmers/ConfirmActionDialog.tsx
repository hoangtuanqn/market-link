import { useTranslation } from 'react-i18next';
import { ReasonField } from '@/components/ReasonField';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ReasonValue } from '@/lib/reasons';
import type { ConfirmAction } from './constants';

type ConfirmActionDialogProps = {
  action: ConfirmAction;
  reason: ReasonValue;
  reasonError?: string;
  onReasonChange: (next: ReasonValue) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmActionDialog = ({
  action,
  reason,
  reasonError,
  onReasonChange,
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) => {
  const { t } = useTranslation('AdminFarmers');
  return (
    <Dialog
      open={action !== null}
      title={action ? t(`${action.kind}.title`, { stall: action.item.stallName }) : ''}
      tone={action?.kind === 'suspend' ? 'danger' : undefined}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('notYet')}
          </Button>
          <Button variant={action?.kind === 'suspend' ? 'dangerFill' : 'primary'} onClick={onConfirm}>
            {action ? t(`${action.kind}.confirm`) : ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{action ? t(`${action.kind}.text`) : ''}</p>
        {action?.kind === 'suspend' && (
          <ReasonField kind="suspend" value={reason} error={reasonError} onChange={onReasonChange} />
        )}
      </div>
    </Dialog>
  );
};

export default ConfirmActionDialog;
