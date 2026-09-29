import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import type { AdminFarmerListItemType } from '@/types/farmer.types';
import type { ConfirmKind } from './constants';

type FarmerActionsProps = {
  farmer: AdminFarmerListItemType;
  busy: boolean;
  onConfirm: (kind: ConfirmKind, farmer: AdminFarmerListItemType) => void;
  onReject: (farmer: AdminFarmerListItemType) => void;
};

const FarmerActions = ({ farmer: f, busy, onConfirm, onReject }: FarmerActionsProps) => {
  const { t } = useTranslation('AdminFarmers');
  if (f.approvalStatus === 'pending') {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={busy} onClick={() => onConfirm('approve', f)}>
          {t('action.approve')}
        </Button>
        <Button variant="danger" size="sm" disabled={busy} onClick={() => onReject(f)}>
          {t('action.reject')}
        </Button>
      </div>
    );
  }
  if (f.approvalStatus === 'approved') {
    return (
      <div className="flex justify-end gap-2">
        <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
          {t('action.view')}
        </ButtonLink>
        <Button variant="danger" size="sm" disabled={busy} onClick={() => onConfirm('suspend', f)}>
          {t('action.suspend')}
        </Button>
      </div>
    );
  }
  if (f.approvalStatus === 'suspended') {
    return (
      <div className="flex justify-end gap-2">
        <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
          {t('action.view')}
        </ButtonLink>
        <Button size="sm" disabled={busy} onClick={() => onConfirm('reinstate', f)}>
          {t('action.reinstate')}
        </Button>
      </div>
    );
  }
  return (
    <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
      {t('action.view')}
    </Link>
  );
};

export default FarmerActions;
