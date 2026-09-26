import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import { StoreIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useSession from '@/hooks/useSession';
import { isEmptyDraft, readDraft } from '@/lib/farmerDraft';
import type { FarmerApproval } from '@/types/farmer.types';

type State =
  | { kind: 'loading' }
  /** Not applied yet, or the status could not be read — both invite applying, and do not block the page. */
  | { kind: 'none'; hasDraft: boolean }
  | { kind: 'applied'; status: FarmerApproval };

/**
 * FR-002 (the signed-in Customer branch). If someone has applied yet the button still says "Apply to sell" they click
 * again and think they must fill everything in again, so this card reads the application status and changes both the
 * wording and the button.
 */
const SellCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const { user } = useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });

  // only setState in a promise callback (the initial state is already loading)
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

  // Once approved the place to go is the Farmer panel, not the application page.
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
    <Card className="border-brand/40 bg-surface-raised hover:border-brand relative flex flex-wrap items-center justify-between gap-6 overflow-hidden p-6 shadow-md transition-all">
      {/* Decorative accent top bar */}
      <div className="bg-brand absolute inset-x-0 top-0 h-1.5" />
      <div className="flex max-w-2xl flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="bg-brand/10 text-brand flex h-8 w-8 items-center justify-center rounded-full">
            <StoreIcon size={18} />
          </span>
          <h2 className="text-h3">{t('sell.title')}</h2>
          <span className="bg-brand text-on-brand rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase">
            Partner
          </span>
        </div>
        <p className="text-ink-muted text-[15px] leading-relaxed">{text}</p>
        {/* Once approved the main button leads to the Farmer panel, so the old application needs a separate way in. */}
        {state.kind === 'applied' && state.status === 'approved' && (
          <Link to="/become-farmer" className="text-brand text-small w-fit font-medium underline">
            {t('sell.history')}
          </Link>
        )}
      </div>
      <div className="flex flex-none items-center">
        {state.kind === 'loading' ? (
          <span aria-busy="true" className="bg-surface-sunken h-[var(--size-control)] w-40 rounded-sm">
            <span className="sr-only">{t('sell.loading')}</span>
          </span>
        ) : (
          <ButtonLink to={to} className="shadow-sm">
            {label}
          </ButtonLink>
        )}
      </div>
    </Card>
  );
};

export default SellCard;
