import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useSession from '@/hooks/useSession';
import { isEmptyDraft, readDraft } from '@/lib/farmerDraft';
import type { FarmerApproval } from '@/types/farmer.types';

type State =
  | { kind: 'loading' }
  /** Chưa nộp đơn, hoặc không đọc được trạng thái — cả hai đều mời nộp đơn, không chặn trang. */
  | { kind: 'none'; hasDraft: boolean }
  | { kind: 'applied'; status: FarmerApproval };

/**
 * FR-002 (nhánh Customer đang đăng nhập). Nộp đơn rồi mà nút vẫn ghi "Apply to sell" thì người dùng bấm vào lại tưởng
 * phải khai lại từ đầu, nên thẻ này đọc trạng thái đơn và đổi cả lời lẫn nút.
 */
const SellCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const { user } = useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchApplication = useCallback(() => {
    const draft = readDraft(user?.id);
    const hasDraft = draft !== null && !isEmptyDraft(draft);
    FarmerApi.myApplication()
      .then((response) =>
        setState(
          response.data ? { kind: 'applied', status: response.data.approvalStatus } : { kind: 'none', hasDraft },
        ),
      )
      .catch(() => setState({ kind: 'none', hasDraft }));
  }, [user?.id]);

  useEffect(fetchApplication, [fetchApplication]);

  const text =
    state.kind === 'applied'
      ? t(`sell.status.${state.status}`)
      : state.kind === 'none' && state.hasDraft
        ? t('sell.draft')
        : t('sell.text');

  // Đã duyệt thì chỗ cần đến là panel Farmer, không phải trang đơn.
  const to = state.kind === 'applied' && state.status === 'approved' ? '/farmer' : '/become-farmer';
  const label =
    state.kind === 'applied'
      ? state.status === 'approved'
        ? t('sell.panel')
        : t('sell.view')
      : state.kind === 'none' && state.hasDraft
        ? t('sell.continue')
        : t('sell.apply');

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex max-w-130 flex-col gap-2">
        <h2 className="text-h3">{t('sell.title')}</h2>
        <p className="text-[15px]">{text}</p>
        {/* Đã duyệt thì nút chính dẫn sang panel Farmer, nên đơn cũ cần một lối đi riêng. */}
        {state.kind === 'applied' && state.status === 'approved' && (
          <Link to="/become-farmer" className="text-brand text-small w-fit underline">
            {t('sell.history')}
          </Link>
        )}
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
