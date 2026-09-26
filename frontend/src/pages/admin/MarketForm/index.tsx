import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { CheckIcon } from '@/components/icons';
import LocationPicker from '@/components/LocationPicker';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_MARKETS_PATH } from '@/constants/nav';
import {
  CLOSURE_HANDLINGS,
  closures as seedClosures,
  marketAdmin,
  type ClosureHandling,
  type ClosureType,
} from '@/data/admin';
import { markets } from '@/data/home';
import { dayName } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Monday-first, which is how the operating days read on the market page. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const DISTRICTS = ['Thủ Đức', 'District 7', 'Bình Thạnh', 'District 1'];

/** A blank market, for the add form. */
const EMPTY = {
  name: '',
  address: '',
  district: DISTRICTS[0],
  days: [6] as number[],
  open: '06:00',
  close: '10:00',
  lat: 10.7769,
  lng: 106.7009,
  notes: '',
};

/**
 * FR-073 — add or edit one market: name, address, operating days, hours and the pin customers navigate to. The closed
 * days panel underneath is where a one-off closure lives, so it has somewhere to sit instead of only being announced.
 */
const AdminMarketFormPage = () => {
  const { t } = useTranslation('AdminMarketForm');
  const { id } = useParams<{ id: string }>();
  const existing = markets.find((m) => String(m.id) === id);
  const isNew = id === 'new' || id === undefined;

  const seed = existing
    ? {
        name: existing.name,
        address: existing.address,
        district: existing.district,
        days: existing.days,
        open: existing.open,
        close: existing.close,
        lat: existing.lat,
        lng: existing.lng,
        notes: marketAdmin[existing.id]?.notes ?? '',
      }
    : EMPTY;

  const [form, setForm] = useState(seed);
  const [closures, setClosures] = useState<ClosureType[]>(
    existing ? seedClosures.filter((c) => c.marketId === existing.id) : [],
  );
  const [addOpen, setAddOpen] = useState(false);
  const [removingClosure, setRemovingClosure] = useState<ClosureType | null>(null);
  const [draft, setDraft] = useState({ date: '2026-10-11', reason: '', handling: 'move' as ClosureHandling });

  if (!existing && !isNew) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to={ADMIN_MARKETS_PATH}>{t('allMarkets')}</ButtonLink>
      </div>
    );
  }

  const toggleDay = (dow: number) =>
    setForm((f) => ({ ...f, days: f.days.includes(dow) ? f.days.filter((d) => d !== dow) : [...f.days, dow].sort() }));

  const addClosure = () => {
    const [year, month, day] = draft.date.split('-');
    setClosures((list) => [
      ...list,
      {
        id: Date.now(),
        marketId: existing?.id ?? 0,
        date: `${day}/${month}/${year}`,
        weekday: new Date(draft.date).toLocaleDateString('en-GB', { weekday: 'long' }),
        reason: draft.reason.trim() || t('closures.noReason'),
        handling: draft.handling,
        orders: 0,
        announced: false,
        by: t('closures.byAdminToday'),
      },
    ]);
    setAddOpen(false);
    setDraft({ date: '2026-10-11', reason: '', handling: 'move' });
    Notification.success({ text: t('closures.added') });
  };

  const removeClosure = () => {
    if (!removingClosure) return;
    setClosures((list) => list.filter((c) => c.id !== removingClosure.id));
    setRemovingClosure(null);
    Notification.success({ text: t('closures.removed') });
  };

  const closureColumns: TableColumn<ClosureType>[] = [
    {
      key: 'date',
      label: t('closures.col.date'),
      render: (c) => (
        <>
          <b>{c.date}</b>
          <span className="text-ink-muted block text-[13px]">{c.weekday}</span>
        </>
      ),
    },
    { key: 'reason', label: t('closures.col.reason') },
    {
      key: 'orders',
      label: t('closures.col.orders'),
      render: (c) =>
        c.orders ? (
          <>
            <b>{c.orders}</b> <span className="text-ink-muted text-[13px]">{t(`handling.${c.handling}.short`)}</span>
          </>
        ) : (
          <span className="text-ink-muted">{t('closures.noneYet')}</span>
        ),
    },
    {
      key: 'announced',
      label: t('closures.col.told'),
      render: (c) =>
        c.announced ? (
          <span className="bg-status-accepted-bg text-status-accepted-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <CheckIcon size={14} />
            {t('closures.announced')}
          </span>
        ) : (
          <span className="text-ink-muted">{t('closures.notYet')}</span>
        ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => (
        <Button variant="danger" size="sm" onClick={() => setRemovingClosure(c)}>
          {t('closures.remove')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_MARKETS_PATH} className="text-brand underline">
          {t('allMarkets')}
        </Link>{' '}
        · {isNew ? t('crumbNew') : t('crumbEdit')}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h2">{isNew ? t('titleNew') : existing?.name}</h1>
        {existing && (
          <span className="text-small text-ink-muted">
            {t('meta', { stalls: existing.stalls, added: marketAdmin[existing.id]?.added })}
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          Notification.success({ text: t('toast.saved', { name: form.name || t('titleNew') }) });
        }}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
        noValidate
      >
        <Card className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="market-name"
              label={t('field.name')}
              required
              className="sm:col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              id="market-address"
              label={t('field.address')}
              required
              className="sm:col-span-2"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <SelectField
              id="market-district"
              label={t('field.district')}
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              options={DISTRICTS}
            />
            <Field id="market-city" label={t('field.city')} value={t('city')} readOnly />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 sm:col-span-2">
              <legend className="text-small mb-1 p-0 font-bold">
                {t('field.days')}
                <span aria-hidden="true" className="text-danger ml-0.5">
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEK.map((dow) => (
                  <label key={dow} className="relative">
                    <input
                      type="checkbox"
                      checked={form.days.includes(dow)}
                      onChange={() => toggleDay(dow)}
                      className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                    />
                    <span
                      className={Helper.cn(
                        'border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-focus flex min-h-11 min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                      )}
                    >
                      {dayName(dow)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              id="market-open"
              label={t('field.open')}
              required
              type="time"
              value={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.value })}
            />
            <Field
              id="market-close"
              label={t('field.close')}
              required
              type="time"
              value={form.close}
              onChange={(e) => setForm({ ...form, close: e.target.value })}
            />
            <Field
              id="market-lat"
              label={t('field.lat')}
              required
              value={form.lat.toFixed(6)}
              onChange={(e) => setForm({ ...form, lat: Number(e.target.value) || form.lat })}
            />
            <Field
              id="market-lng"
              label={t('field.lng')}
              required
              hint={t('field.lngHint')}
              value={form.lng.toFixed(6)}
              onChange={(e) => setForm({ ...form, lng: Number(e.target.value) || form.lng })}
            />

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="market-notes" className="text-small font-bold">
                {t('field.notes')}
              </label>
              <textarea
                id="market-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="border-line-strong bg-surface-raised focus:outline-focus min-h-18 rounded-sm border-[1.5px] p-3 focus:outline-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">{t('action.save')}</Button>
            <ButtonLink to={ADMIN_MARKETS_PATH} variant="secondary">
              {t('action.cancel')}
            </ButtonLink>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <LocationPicker
            label={t('pin.label')}
            lat={form.lat}
            lng={form.lng}
            pinLabel={form.name || t('titleNew')}
            onMove={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
            className="min-h-75"
          />
          <p className="text-ink-muted text-[13px]">{t('pin.note')}</p>
        </div>
      </form>

      <Card as="section" className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-160 flex-col gap-1">
            <h2 className="text-h3">{t('closures.title')}</h2>
            <p className="text-small text-ink-muted">{t('closures.intro')}</p>
          </div>
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            {t('closures.add')}
          </Button>
        </div>

        {closures.length ? (
          <Table columns={closureColumns} rows={closures} />
        ) : (
          <DataState title={t('closures.empty.title')} text={t('closures.empty.text')} />
        )}
      </Card>

      <Dialog
        open={addOpen}
        title={t('closures.add')}
        onClose={() => setAddOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={addClosure}>{t('closures.addConfirm')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field
            id="closure-date"
            label={t('closures.field.date')}
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <Field
            id="closure-reason"
            label={t('closures.field.reason')}
            placeholder={t('closures.field.reasonPlaceholder')}
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
          />
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="text-small mb-1 p-0 font-bold">{t('closures.field.handling')}</legend>
            {CLOSURE_HANDLINGS.map((key) => (
              <label key={key} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="closure-handling"
                  checked={draft.handling === key}
                  onChange={() => setDraft({ ...draft, handling: key })}
                  className="accent-brand mt-1 size-4.5 flex-none cursor-pointer"
                />
                <span className="text-[15px]">
                  <b>{t(`handling.${key}.title`)}</b>
                  <small className="text-ink-muted block text-[13px]">{t(`handling.${key}.text`)}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </Dialog>

      <Dialog
        open={removingClosure !== null}
        tone="danger"
        title={t('closures.removeTitle')}
        onClose={() => setRemovingClosure(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemovingClosure(null)}>
              {t('closures.keep')}
            </Button>
            <Button variant="danger" onClick={removeClosure}>
              {t('closures.remove')}
            </Button>
          </>
        }
      >
        <p>{t('closures.removeText')}</p>
      </Dialog>
    </div>
  );
};

export default AdminMarketFormPage;
