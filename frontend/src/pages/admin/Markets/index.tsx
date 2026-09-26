import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_MARKETS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { dayList, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];

/**
 * FR-073 — name, address, operating days, hours and map coordinates for each market. Removing a market hides it from
 * customers (`DELETE /admin/markets/{id}` is a soft delete); its history stays.
 */
const AdminMarketsPage = () => {
  const { t } = useTranslation('AdminMarkets');
  const { t: tc } = useTranslation();
  const [removing, setRemoving] = useState<MarketType | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    state: load,
    retry,
    mutate,
  } = useRequest('admin-markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const markets = load.kind === 'ready' ? load.data : NO_MARKETS;

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await CatalogApi.deactivateMarket(removing.id);
      mutate((list) => list.filter((m) => m.id !== removing.id));
      Notification.success({ text: t('toast.removed', { name: removing.name }) });
      setRemoving(null);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  const markers: MapMarker[] = markets.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    kind: 'market',
    label: m.name,
    popup: {
      title: m.name,
      lines: [t('stalls', { count: m.stalls })],
      href: `${ADMIN_MARKETS_PATH}/${m.id}`,
    },
  }));

  const columns: TableColumn<MarketType>[] = [
    {
      key: 'name',
      label: t('col.market'),
      render: (m) => (
        <>
          <Link to={`${ADMIN_MARKETS_PATH}/${m.id}`} className="text-brand underline">
            <b>{m.name}</b>
          </Link>
          <span className="text-ink-muted block text-[13px]">{m.address}</span>
        </>
      ),
    },
    {
      key: 'days',
      label: t('col.days'),
      render: (m) => (
        <>
          {dayList(m.days)}
          <span className="text-ink-muted block text-[13px]">
            {formatClock(m.open)}–{formatClock(m.close)}
          </span>
        </>
      ),
    },
    {
      key: 'coords',
      label: t('col.coordinates'),
      render: (m) => (
        <span className="tabular-nums">
          {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
        </span>
      ),
    },
    { key: 'stalls', label: t('col.stalls'), align: 'num' },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (m) => (
        <div className="flex justify-end gap-2">
          <ButtonLink to={`${ADMIN_MARKETS_PATH}/${m.id}`} variant="secondary" size="sm">
            {t('action.edit')}
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setRemoving(m)}>
            {t('action.remove')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <ButtonLink to={`${ADMIN_MARKETS_PATH}/new`}>{t('action.add')}</ButtonLink>
      </div>

      {load.kind === 'loading' ? (
        <MarketCardSkeleton count={3} />
      ) : load.kind === 'error' ? (
        <LoadError noun={t('error.noun')} onRetry={retry} />
      ) : markets.length ? (
        <Table caption={t('caption', { count: markets.length })} columns={columns} rows={markets} />
      ) : (
        <DataState fill title={t('empty.title')} text={t('empty.text')} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-h3">{t('map.title')}</h2>
        {markets.length ? (
          <MarketMap label={t('map.label')} markers={markers} className="min-h-100" scrollWheelZoom={false} />
        ) : (
          <DataState
            fill
            title={t('map.empty.title')}
            text={t('map.empty.text')}
            action={<ButtonLink to={`${ADMIN_MARKETS_PATH}/new`}>{t('action.add')}</ButtonLink>}
          />
        )}
      </section>

      <Dialog
        open={removing !== null}
        tone="danger"
        title={removing ? t('remove.title', { name: removing.name }) : ''}
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>
              {t('remove.keep')}
            </Button>
            <Button variant="danger" onClick={confirmRemove} disabled={busy}>
              {t('remove.confirm')}
            </Button>
          </>
        }
      >
        <p>{removing ? t('remove.text', { count: removing.stalls }) : ''}</p>
      </Dialog>
    </div>
  );
};

export default AdminMarketsPage;
