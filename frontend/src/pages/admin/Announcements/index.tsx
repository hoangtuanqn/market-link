import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { CheckIcon, CircleSlashIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CATEGORIES_PATH, ADMIN_FEEDBACK_PATH } from '@/constants/nav';
import { announcements, type AdminAnnouncementType } from '@/data/admin';
import { markets } from '@/data/home';
import Notification from '@/utils/notification';

const AUDIENCES: AdminAnnouncementType['audience'][] = ['Everyone', 'Customers', 'Farmers'];

/**
 * FR-077 — a platform-wide message shown in the green band above the header and in everyone's notifications. One active
 * announcement at a time keeps it readable.
 */
const AdminAnnouncementsPage = () => {
  const { t } = useTranslation('AdminAnnouncements');

  const [form, setForm] = useState({
    title: '',
    text: '',
    audience: AUDIENCES[0] as string,
    market: '',
    from: '2026-09-24',
    to: '2026-10-04',
  });

  const columns: TableColumn<AdminAnnouncementType>[] = [
    {
      key: 'title',
      label: t('col.announcement'),
      render: (a) => (
        <>
          <b>{a.title}</b>
          <span className="text-ink-muted block text-[13px]">{a.text}</span>
        </>
      ),
    },
    { key: 'audience', label: t('col.showTo'), render: (a) => t(`audience.${a.audience}`) },
    { key: 'window', label: t('col.window'), render: (a) => `${a.from} – ${a.to}` },
    {
      key: 'status',
      label: t('col.status'),
      render: (a) =>
        a.active ? (
          <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <CheckIcon size={14} />
            {t('status.live')}
          </span>
        ) : (
          <span className="bg-status-cancelled-bg text-status-cancelled-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <CircleSlashIcon size={14} />
            {t('status.ended')}
          </span>
        ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (a) =>
        a.active ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm">
              {t('action.edit')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => Notification.success({ text: t('toast.takenDown') })}>
              {t('action.takeDown')}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, title: a.title, text: a.text })}>
            {t('action.reuse')}
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={ADMIN_CATEGORIES_PATH} variant="secondary">
            {t('link.categories')}
          </ButtonLink>
          <ButtonLink to={ADMIN_FEEDBACK_PATH} variant="secondary">
            {t('link.feedback')}
          </ButtonLink>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card
          as="form"
          className="flex flex-col gap-4 p-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            Notification.success({ text: t('toast.published') });
          }}
        >
          <h2 className="text-h3">{t('form.title')}</h2>
          <Field
            id="announcement-title"
            label={t('form.headline')}
            required
            maxLength={80}
            placeholder={t('form.headlinePlaceholder')}
            hint={t('form.headlineHint')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="announcement-text" className="text-small font-bold">
              {t('form.detail')}
            </label>
            <textarea
              id="announcement-text"
              value={form.text}
              placeholder={t('form.detailPlaceholder')}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="border-line-strong bg-surface-raised focus:outline-focus min-h-18 rounded-sm border-[1.5px] p-3 focus:outline-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="announcement-audience"
              label={t('form.showTo')}
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              options={AUDIENCES.map((a) => ({ value: a, label: t(`audience.${a}`) }))}
            />
            <SelectField
              id="announcement-market"
              label={t('form.aboutMarket')}
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
              options={[
                { value: '', label: t('form.wholePlatform') },
                ...markets.map((m) => ({ value: m.name, label: m.name })),
              ]}
            />
            <Field
              id="announcement-from"
              label={t('form.from')}
              type="date"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
            <Field
              id="announcement-to"
              label={t('form.to')}
              type="date"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-small font-bold">{t('form.preview')}</span>
            <div className="border-line-strong overflow-hidden rounded-sm border-[1.5px]">
              <AnnouncementBanner
                announcement={{
                  title: form.title || t('form.previewTitle'),
                  text: form.text || t('form.previewText'),
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">{t('action.publish')}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => Notification.success({ text: t('toast.draftSaved') })}
            >
              {t('action.saveDraft')}
            </Button>
          </div>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-h3">{t('list.title')}</h2>
          {announcements.length ? (
            <Table columns={columns} rows={announcements} />
          ) : (
            <DataState title={t('empty.title')} text={t('empty.text')} />
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;
