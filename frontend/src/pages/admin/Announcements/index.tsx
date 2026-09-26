import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AnnouncementApi from '@/api-requests/announcement.requests';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { CheckIcon, CircleSlashIcon, ClockIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CATEGORIES_PATH, ADMIN_FEEDBACK_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import type { Announcement, AnnouncementAudience } from '@/types/notification.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** API value → the page's old translation key (audience.Everyone / Customers / Farmers). */
const AUDIENCES: { value: AnnouncementAudience; label: 'Everyone' | 'Customers' | 'Farmers' }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'customers', label: 'Customers' },
  { value: 'farmers', label: 'Farmers' },
];

const TITLE_MAX = 150;
const CONTENT_MAX = 1000;

type Form = { title: string; content: string; audience: AnnouncementAudience; from: string; to: string };
type Errors = Partial<Record<'title' | 'content' | 'to', string>>;
type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: Announcement[] };

const EMPTY: Form = { title: '', content: '', audience: 'all', from: '', to: '' };

/** The date box's Yyyy-mm-dd → ISO; "to" counts through the end of that day. Empty → null (no limit). */
const toIso = (day: string, endOfDay: boolean) =>
  day ? new Date(`${day}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString() : null;

/** Removed or past "to" → ended; still on but not yet at "from" → scheduled (not ended). */
const phaseOf = (a: Announcement, now = Date.now()): 'live' | 'scheduled' | 'ended' => {
  if (!a.active || (a.endsAt && new Date(a.endsAt).getTime() <= now)) return 'ended';
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return 'scheduled';
  return 'live';
};

const PHASE_BADGE = {
  live: { className: 'bg-status-ready-bg text-status-ready-ink', Icon: CheckIcon },
  scheduled: { className: 'bg-status-placed-bg text-status-placed-ink', Icon: ClockIcon },
  ended: { className: 'bg-status-cancelled-bg text-status-cancelled-ink', Icon: CircleSlashIcon },
} as const;

/**
 * FR-077 — platform-wide announcements: the banner strip on the header (banner) and a row in the notifications of
 * everyone in the audience. Posting sends immediately; removing only removes the banner, notifications already sent are
 * kept.
 */
const AdminAnnouncementsPage = () => {
  const { t } = useTranslation('AdminAnnouncements');
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [publishing, setPublishing] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });

  const fetchList = () =>
    AnnouncementApi.adminList()
      .then((res) => setState({ status: 'ready', items: res.data.items }))
      .catch(() => setState({ status: 'error' }));

  useEffect(() => {
    void fetchList();
  }, []);

  const validate = (f: Form): Errors => {
    const e: Errors = {};
    if (!f.title.trim()) e.title = t('errors.titleRequired');
    else if (f.title.length > TITLE_MAX) e.title = t('errors.titleLong', { max: TITLE_MAX });
    if (!f.content.trim()) e.content = t('errors.contentRequired');
    else if (f.content.length > CONTENT_MAX) e.content = t('errors.contentLong', { max: CONTENT_MAX });
    if (f.from && f.to && f.to < f.from) e.to = t('errors.window');
    return e;
  };

  const publish = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setPublishing(true);
    try {
      await AnnouncementApi.create({
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        startsAt: toIso(form.from, false),
        endsAt: toIso(form.to, true),
      });
      Notification.success({ text: t('toast.published') });
      setForm(EMPTY);
      void fetchList();
    } catch (error) {
      setErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.publishError')) });
    } finally {
      setPublishing(false);
    }
  };

  const takeDown = async (a: Announcement) => {
    try {
      await AnnouncementApi.takeDown(a.id);
      Notification.success({ text: t('toast.takenDown') });
      void fetchList();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.takeDownError')) });
    }
  };

  const audienceLabel = (value: AnnouncementAudience) =>
    t(`audience.${AUDIENCES.find((x) => x.value === value)?.label ?? 'Everyone'}`);

  const windowLabel = (a: Announcement) =>
    `${a.startsAt ? formatDate(new Date(a.startsAt)) : t('window.now')} – ${
      a.endsAt ? formatDate(new Date(a.endsAt)) : t('window.open')
    }`;

  const columns: TableColumn<Announcement>[] = [
    {
      key: 'title',
      label: t('col.announcement'),
      render: (a) => (
        <>
          <b>{a.title}</b>
          <span className="text-ink-muted block text-[13px]">{a.content}</span>
        </>
      ),
    },
    { key: 'audience', label: t('col.showTo'), render: (a) => audienceLabel(a.audience) },
    { key: 'window', label: t('col.window'), render: windowLabel },
    {
      key: 'status',
      label: t('col.status'),
      render: (a) => {
        const phase = phaseOf(a);
        const { className, Icon } = PHASE_BADGE[phase];
        return (
          <span
            className={`${className} inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold`}
          >
            <Icon size={14} />
            {t(`status.${phase}`)}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (a) =>
        a.active ? (
          <Button variant="danger" size="sm" onClick={() => void takeDown(a)}>
            {t('action.takeDown')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setForm({ ...EMPTY, title: a.title, content: a.content, audience: a.audience })}
          >
            {t('action.reuse')}
          </Button>
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
        <Card className="p-6">
          <form noValidate onSubmit={(e) => void publish(e)} className="flex flex-col gap-4">
            <h2 className="text-h3">{t('form.title')}</h2>
            <Field
              id="announcement-title"
              label={t('form.headline')}
              required
              maxLength={TITLE_MAX}
              placeholder={t('form.headlinePlaceholder')}
              hint={t('form.headlineHint')}
              value={form.title}
              error={errors.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="announcement-text" className="text-small font-bold">
                {t('form.detail')}
              </label>
              <textarea
                id="announcement-text"
                value={form.content}
                maxLength={CONTENT_MAX}
                placeholder={t('form.detailPlaceholder')}
                aria-invalid={!!errors.content}
                aria-describedby={errors.content ? 'announcement-text-err' : undefined}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className={Helper.cn(
                  'bg-surface-raised focus:outline-focus min-h-18 rounded-sm border-[1.5px] p-3 focus:outline-2',
                  errors.content ? 'border-danger' : 'border-line-strong',
                )}
              />
              {errors.content && (
                <p id="announcement-text-err" className="text-small text-danger">
                  {errors.content}
                </p>
              )}
            </div>
            <SelectField
              id="announcement-audience"
              label={t('form.showTo')}
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}
              options={AUDIENCES.map((a) => ({ value: a.value, label: t(`audience.${a.label}`) }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="announcement-from"
                label={t('form.from')}
                type="date"
                hint={t('form.windowHint')}
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
              />
              <Field
                id="announcement-to"
                label={t('form.to')}
                type="date"
                value={form.to}
                error={errors.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-small font-bold">{t('form.preview')}</span>
              <div className="border-line-strong overflow-hidden rounded-sm border-[1.5px]">
                <AnnouncementBanner
                  announcement={{
                    title: form.title || t('form.previewTitle'),
                    text: form.content || t('form.previewText'),
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={publishing}>
                {publishing ? t('action.publishing') : t('action.publish')}
              </Button>
            </div>
          </form>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-h3">{t('list.title')}</h2>
          {state.status === 'loading' && <p className="text-small text-ink-muted">{t('list.loading')}</p>}
          {state.status === 'error' && (
            <DataState
              variant="error"
              title={t('list.errorTitle')}
              text={t('list.errorText')}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setState({ status: 'loading' });
                    void fetchList();
                  }}
                >
                  {t('list.retry')}
                </Button>
              }
            />
          )}
          {state.status === 'ready' &&
            (state.items.length ? (
              <Table columns={columns} rows={state.items} />
            ) : (
              <DataState title={t('empty.title')} text={t('empty.text')} />
            ))}
        </section>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;
