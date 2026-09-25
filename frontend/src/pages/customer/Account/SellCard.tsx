import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FarmerApi from '@/api-requests/farmer.requests';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FarmerApproval } from '@/types/farmer.types';

type State =
  | { kind: 'loading' }
  /** Chưa nộp đơn, hoặc không đọc được trạng thái — cả hai đều mời nộp đơn, không chặn trang. */
  | { kind: 'none' }
  | { kind: 'applied'; status: FarmerApproval };

/**
 * FR-002 (nhánh Customer đang đăng nhập). Nộp đơn rồi mà nút vẫn ghi "Apply to sell" thì người dùng bấm vào lại tưởng
 * phải khai lại từ đầu, nên thẻ này đọc trạng thái đơn và đổi cả lời lẫn nút.
 */
const SellCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const [state, setState] = useState<State>({ kind: 'loading' });

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchApplication = useCallback(() => {
    FarmerApi.myApplication()
      .then((response) =>
        setState(response.data ? { kind: 'applied', status: response.data.approvalStatus } : { kind: 'none' }),
      )
      .catch(() => setState({ kind: 'none' }));
  }, []);

  useEffect(fetchApplication, [fetchApplication]);

  const text = state.kind === 'applied' ? t(`sell.status.${state.status}`) : t('sell.text');
  // Đã duyệt thì chỗ cần đến là panel Farmer, không phải trang đơn.
  const to = state.kind === 'applied' && state.status === 'approved' ? '/farmer' : '/become-farmer';
  const label =
    state.kind !== 'applied' ? t('sell.apply') : state.status === 'approved' ? t('sell.panel') : t('sell.view');

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex max-w-130 flex-col gap-2">
        <h2 className="text-h3">{t('sell.title')}</h2>
        <p className="text-[15px]">{text}</p>
      </div>
      {state.kind === 'loading' ? (
        <span aria-busy="true" className="bg-surface-sunken h-[var(--size-control)] w-40 rounded-sm">
          <span className="sr-only">{t('sell.loading')}</span>
        </span>
      ) : (
        <ButtonLink to={to}>{label}</ButtonLink>
      )}
    </Card>
  );
};

export default SellCard;
