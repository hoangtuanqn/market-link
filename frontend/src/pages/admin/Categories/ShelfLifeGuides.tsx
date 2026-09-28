import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryType } from '@/api-requests/catalog.requests';
import ShelfLifeApi, { type ShelfLifeGuideDto, type StorageMode } from '@/api-requests/shelf-life.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const NO_GUIDES: ShelfLifeGuideDto[] = [];
const MODES: StorageMode[] = ['room', 'chilled'];
type NewGuide = { groupName: string; examples: string; storageMode: StorageMode; days: string };
const EMPTY_GUIDE: NewGuide = { groupName: '', examples: '', storageMode: 'room', days: '' };

/**
 * FR-120 — the storage groups of one category: each row is a group kept one way, with the suggested shelf life the
 * product form starts from. Rows are turned off, never deleted, so products keep their saved numbers.
 */
const ShelfLifeGuides = ({ categories }: { categories: CategoryType[] }) => {
  const { t } = useTranslation('AdminCategories');
  const { t: tc } = useTranslation();
  const [pickedCategory, setPickedCategory] = useState<number | null>(null);
  const categoryId = pickedCategory ?? categories[0]?.id ?? null;
  const { state, retry, mutate } = useRequest(`admin-shelf-guides:${categoryId ?? 'none'}`, () =>
    categoryId == null ? Promise.resolve(NO_GUIDES) : ShelfLifeApi.adminList(categoryId),
  );
  const guides = state.kind === 'ready' ? state.data : NO_GUIDES;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState<NewGuide>(EMPTY_GUIDE);
  const [errors, setErrors] = useState<{ groupName?: string; days?: string }>({});

  const replace = (saved: ShelfLifeGuideDto) => mutate((list) => list.map((g) => (g.id === saved.id ? saved : g)));

  const inputOf = (g: ShelfLifeGuideDto, patch: Partial<ShelfLifeGuideDto> = {}) => ({
    categoryId: g.categoryId,
    groupName: g.groupName,
    examples: g.examples,
    storageMode: g.storageMode,
    suggestedDays: g.suggestedDays,
    ...patch,
  });

  const saveDays = async (g: ShelfLifeGuideDto) => {
    const days = Number(drafts[g.id] ?? g.suggestedDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      Notification.error({ text: t('guides.error.days') });
      return;
    }
    setBusyId(g.id);
    try {
      replace(await ShelfLifeApi.adminUpdate(g.id, inputOf(g, { suggestedDays: days })));
      Notification.success({ text: t('guides.toast.saved') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (g: ShelfLifeGuideDto) => {
    setBusyId(g.id);
    try {
      if (g.isActive) {
        await ShelfLifeApi.adminDeactivate(g.id);
        replace({ ...g, isActive: false });
        Notification.success({ text: t('guides.toast.off') });
      } else {
        replace(await ShelfLifeApi.adminUpdate(g.id, { ...inputOf(g), active: true }));
        Notification.success({ text: t('guides.toast.on') });
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    const days = Number(form.days);
    const next: typeof errors = {};
    if (!form.groupName.trim()) next.groupName = t('guides.error.nameRequired');
    if (!Number.isInteger(days) || days < 1 || days > 365) next.days = t('guides.error.days');
    setErrors(next);
    if (Object.keys(next).length || categoryId == null) return;
    setBusyId(0);
    try {
      const created = await ShelfLifeApi.adminCreate({
        categoryId,
        groupName: form.groupName.trim(),
        examples: form.examples.trim(),
        storageMode: form.storageMode,
        suggestedDays: days,
      });
      mutate((list) => [...list, created]);
      setForm(EMPTY_GUIDE);
      Notification.success({ text: t('guides.toast.added') });
    } catch (error) {
      if (Helper.getErrorCode(error) === 'DUPLICATE_SHELF_LIFE_GUIDE')
        setErrors({ groupName: t('guides.error.taken') });
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<ShelfLifeGuideDto>[] = [
    { key: 'group', label: t('guides.col.group'), render: (g) => <b>{g.groupName}</b> },
    {
      key: 'examples',
      label: t('guides.col.examples'),
      render: (g) => <span className="text-small">{g.examples}</span>,
    },
    { key: 'storage', label: t('guides.col.storage'), render: (g) => tc(`storageMode.${g.storageMode}`) },
    {
      key: 'days',
      label: t('guides.col.days'),
      align: 'num',
      render: (g) => (
        <Field
          id={`guide-days-${g.id}`}
          label={t('guides.col.daysFor', { group: g.groupName })}
          hideLabel
          type="number"
          value={drafts[g.id] ?? String(g.suggestedDays)}
          onChange={(e) => setDrafts({ ...drafts, [g.id]: e.target.value })}
        />
      ),
    },
    {
      key: 'status',
      label: t('guides.col.status'),
      render: (g) => (g.isActive ? t('guides.status.on') : t('guides.status.off')),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (g) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void saveDays(g)} disabled={busyId === g.id}>
            {t('guides.action.save')}
          </Button>
          <Button
            variant={g.isActive ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => void toggle(g)}
            disabled={busyId === g.id}
          >
            {g.isActive ? t('guides.action.off') : t('guides.action.on')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="shelf-guides-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="shelf-guides-title" className="text-h2">
            {t('guides.title')}
          </h2>
          <p className="text-body max-w-160">{t('guides.intro')}</p>
        </div>
        <SelectField
          id="guides-category"
          label={t('guides.category')}
          value={categoryId == null ? '' : String(categoryId)}
          onChange={(e) => {
            setPickedCategory(Number(e.target.value));
            setDrafts({});
          }}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {state.kind === 'loading' ? (
          <MarketCardSkeleton count={2} />
        ) : state.kind === 'error' ? (
          <LoadError noun={t('guides.noun')} onRetry={retry} />
        ) : guides.length ? (
          <Table caption={t('guides.title')} columns={columns} rows={guides} />
        ) : (
          <DataState title={t('guides.empty.title')} text={t('guides.empty.text')} />
        )}

        <Card
          as="form"
          className="flex flex-col gap-4 self-start p-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <h3 className="text-h3">{t('guides.form.title')}</h3>
          <Field
            id="guide-group"
            label={t('guides.form.group')}
            required
            placeholder={t('guides.form.groupPlaceholder')}
            value={form.groupName}
            onChange={(e) => setForm({ ...form, groupName: e.target.value })}
            error={errors.groupName}
          />
          <Field
            id="guide-examples"
            label={t('guides.form.examples')}
            hint={t('guides.form.examplesHint')}
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
          />
          <SelectField
            id="guide-storage"
            label={t('guides.form.storage')}
            required
            value={form.storageMode}
            onChange={(e) => setForm({ ...form, storageMode: e.target.value as StorageMode })}
            options={MODES.map((m) => ({ value: m, label: tc(`storageMode.${m}`) }))}
          />
          <Field
            id="guide-days"
            label={t('guides.form.days')}
            required
            type="number"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            error={errors.days}
          />
          <Button type="submit" disabled={busyId === 0 || categoryId == null}>
            {t('guides.form.submit')}
          </Button>
        </Card>
      </div>
    </section>
  );
};

export default ShelfLifeGuides;
