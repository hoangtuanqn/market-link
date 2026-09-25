import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import MarketMap, { type MapMarker } from '@/components/MarketMap';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_MARKETS_PATH } from '@/constants/nav';
import { markets } from '@/data/home';
import { dayList, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import Notification from '@/utils/notification';

/**
 * FR-073 — name, address, operating days, hours and map coordinates for each market. Removing a market hides it from
 * customers; its history stays.
 *
 * The list is the frozen demo data in `@/data/home` until markets have a table of their own.
 */
const AdminMarketsPage = () => {
  const { t } = useTranslation('AdminMarkets');
  const [removing, setRemoving] = useState<MarketType | null>(null);

  const confirmRemove = () => {
    if (!removing) return;
    Notification.success({ text: t('toast.removed', { name: removing.name }) });
    setRemoving(null);
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

      {markets.length ? (
        <Table caption={t('caption', { count: markets.length })} columns={columns} rows={markets} />
      ) : (
        <DataState title={t('empty.title')} text={t('empty.text')} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-h3">{t('map.title')}</h2>
        <MarketMap label={t('map.label')} markers={markers} className="min-h-100" scrollWheelZoom={false} />
      </section>

      <Dialog
        open={removing !== null}
        tone="danger"
        title={removing ? t('remove.title', { name: removing.name }) : ''}
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t('remove.keep')}
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
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
