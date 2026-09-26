import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi, { type CategoryType } from '@/api-requests/catalog.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { ADMIN_ANNOUNCEMENTS_PATH, ADMIN_FEEDBACK_PATH } from '@/constants/nav';
import { farmers, products } from '@/data/catalog';
import { UNIT_KINDS, UNIT_LIST, type UnitOption } from '@/data/units';
import useRequest from '@/hooks/useRequest';
import { guessPlural, perUnit, units } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type CategoryRow = CategoryType;
const NO_CATEGORIES: CategoryRow[] = [];

const bySortThenName = (a: CategoryRow, b: CategoryRow) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/**
 * The two lists every stall picks from when it adds a product. Categories are the admin's to set; units are theirs to
 * curate, but a stall can always name its own when nothing here fits — a unit is kept as text on the product.
 */
const AdminCategoriesPage = () => {
  const { t } = useTranslation('AdminCategories');
  const { t: tc } = useTranslation();
  const [tab, setTab] = useState('categories');

  const { state: load, retry, mutate } = useRequest('categories', () => CatalogApi.listCategories());
  const categories = load.kind === 'ready' ? load.data : NO_CATEGORIES;
  const replaceCategories = (next: (current: CategoryRow[]) => CategoryRow[]) =>
    mutate((current) => next(current).sort(bySortThenName));

  const [newCategory, setNewCategory] = useState({ name: '', position: '' });
  const [newCategoryError, setNewCategoryError] = useState<string>();
  /** Names typed into the table but not saved yet, by category id. */
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const saveCategory = async (c: CategoryRow) => {
    const name = (drafts[c.id] ?? c.name).trim();
    if (!name) return;
    setBusyId(c.id);
    try {
      const saved = await CatalogApi.updateCategory(c.id, { name, sortOrder: c.sortOrder });
      replaceCategories((list) => list.map((row) => (row.id === c.id ? { ...saved, count: row.count } : row)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[c.id];
        return next;
      });
      Notification.success({ text: t('toast.categorySaved', { name: saved.name }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const addCategory = async () => {
    const name = newCategory.name.trim();
    if (!name) {
      setNewCategoryError(t('error.nameRequired'));
      return;
    }
    setNewCategoryError(undefined);
    const position = Number(newCategory.position);
    setBusyId(0);
    try {
      const created = await CatalogApi.createCategory({
        name,
        sortOrder: Number.isFinite(position) && position > 0 ? position : categories.length + 1,
      });
      replaceCategories((list) => [...list, created]);
      Notification.success({ text: t('toast.categoryAdded') });
      setNewCategory({ name: '', position: '' });
    } catch (error) {
      setNewCategoryError(Helper.getFieldErrors(error).name ?? Helper.getErrorMessage(error, tc('errors.network')));
    } finally {
      setBusyId(null);
    }
  };

  const removeCategory = async () => {
    if (!removing) return;
    setBusyId(removing.id);
    try {
      await CatalogApi.deactivateCategory(removing.id);
      replaceCategories((list) => list.filter((row) => row.id !== removing.id));
      Notification.success({ text: t('toast.categoryRemoved', { name: removing.name }) });
      setRemoving(null);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const [newUnit, setNewUnit] = useState({ one: '', many: '', kind: UNIT_KINDS[0] });
  const [merging, setMerging] = useState<UnitOption | null>(null);
  const [mergeInto, setMergeInto] = useState('');

  /** How many stalls have at least one product in this category. */
  const stallsIn = (categoryName: string) =>
    farmers.filter((f) => products.some((p) => p.farmerId === f.id && p.category === categoryName)).length;

  const previewOne = newUnit.one.trim() || t('unitForm.previewFallback');
  const previewMany = newUnit.many.trim() || guessPlural(previewOne);

  const categoryColumns: TableColumn<CategoryRow>[] = [
    {
      key: 'name',
      label: t('col.category'),
      render: (c) => (
        <input
          value={drafts[c.id] ?? c.name}
          onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
          aria-label={t('col.nameOf', { name: c.name })}
          className="border-line-strong bg-surface-raised focus:outline-focus min-h-9 w-full max-w-50 rounded-sm border-[1.5px] px-2 focus:outline-2"
        />
      ),
    },
    { key: 'count', label: t('col.products'), align: 'num' },
    { key: 'stalls', label: t('col.stalls'), align: 'num', render: (c) => stallsIn(c.name) },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => saveCategory(c)} disabled={busyId === c.id}>
            {t('action.save')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRemoving(c)} disabled={busyId === c.id}>
            {t('action.remove')}
          </Button>
        </div>
      ),
    },
  ];

  const unitColumns: TableColumn<UnitOption>[] = [
    {
      key: 'one',
      label: t('col.oneOfThem'),
      render: (u) => (
        <>
          <b>{u.one}</b>
          {!u.builtin && <span className="text-ink-muted block text-[13px]">{t('addedBy', { by: u.addedBy })}</span>}
        </>
      ),
    },
    {
      key: 'many',
      label: t('col.moreThanOne'),
      render: (u) => (
        <input
          defaultValue={u.many}
          aria-label={t('col.pluralOf', { name: u.one })}
          className="border-line-strong bg-surface-raised focus:outline-focus min-h-9 w-38 rounded-sm border-[1.5px] px-2 focus:outline-2"
        />
      ),
    },
    { key: 'kind', label: t('col.kind'), render: (u) => t(`kind.${u.kind}`) },
    { key: 'used', label: t('col.products'), align: 'num' },
    {
      key: 'reads',
      label: t('col.readsAs'),
      render: (u) => (
        <span className="text-ink-muted">
          {units(1, u.one, u.many)} · {units(12, u.one, u.many)}
        </span>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (u) =>
        u.builtin ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => Notification.success({ text: t('toast.unitSaved', { name: u.one }) })}
          >
            {t('action.save')}
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => Notification.success({ text: t('toast.promoted', { name: u.one }) })}>
              {t('action.addToPicker')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMerging(u)}>
              {t('action.merge')}
            </Button>
          </div>
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
          <ButtonLink to={ADMIN_ANNOUNCEMENTS_PATH} variant="secondary">
            {t('link.announcements')}
          </ButtonLink>
          <ButtonLink to={ADMIN_FEEDBACK_PATH} variant="secondary">
            {t('link.feedback')}
          </ButtonLink>
        </div>
      </div>

      <Tabs
        label={t('tabsLabel')}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'categories', label: t('tab.categories'), count: categories.length },
          { id: 'units', label: t('tab.units'), count: UNIT_LIST.length },
        ]}
      />

      {tab === 'categories' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {load.kind === 'loading' ? (
            <MarketCardSkeleton count={3} />
          ) : load.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retry} />
          ) : categories.length ? (
            <Table
              caption={t('caption.categories', { count: categories.length })}
              columns={categoryColumns}
              rows={categories}
            />
          ) : (
            <DataState title={t('empty.categories.title')} text={t('empty.categories.text')} />
          )}

          <Card
            as="form"
            className="flex flex-col gap-4 p-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void addCategory();
            }}
          >
            <h2 className="text-h3">{t('categoryForm.title')}</h2>
            <Field
              id="new-category-name"
              label={t('categoryForm.name')}
              required
              placeholder={t('categoryForm.namePlaceholder')}
              hint={t('categoryForm.nameHint')}
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              error={newCategoryError}
            />
            <Field
              id="new-category-position"
              label={t('categoryForm.position')}
              type="number"
              placeholder={String(categories.length + 1)}
              value={newCategory.position}
              onChange={(e) => setNewCategory({ ...newCategory, position: e.target.value })}
            />
            <Button type="submit" disabled={busyId === 0}>
              {t('categoryForm.submit')}
            </Button>
          </Card>
        </div>
      )}

      {tab === 'units' && (
        <div className="flex flex-col gap-4">
          <Banner variant="info" title={t('unitNote.title')}>
            {t('unitNote.text')}
          </Banner>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex flex-col gap-3">
              <Table caption={t('caption.units', { count: UNIT_LIST.length })} columns={unitColumns} rows={UNIT_LIST} />
              <p className="text-small text-ink-muted">{t('unitsNote')}</p>
            </div>

            <Card
              as="form"
              className="flex flex-col gap-4 p-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                Notification.success({ text: t('toast.unitAdded') });
                setNewUnit({ one: '', many: '', kind: UNIT_KINDS[0] });
              }}
            >
              <h2 className="text-h3">{t('unitForm.title')}</h2>
              <Field
                id="new-unit-one"
                label={t('unitForm.one')}
                required
                placeholder="tray of 30"
                value={newUnit.one}
                onChange={(e) => setNewUnit({ ...newUnit, one: e.target.value })}
              />
              <Field
                id="new-unit-many"
                label={t('unitForm.many')}
                required
                placeholder={guessPlural(newUnit.one.trim() || 'tray of 30')}
                hint={t('unitForm.manyHint')}
                value={newUnit.many}
                onChange={(e) => setNewUnit({ ...newUnit, many: e.target.value })}
              />
              <SelectField
                id="new-unit-kind"
                label={t('unitForm.kind')}
                value={newUnit.kind}
                onChange={(e) => setNewUnit({ ...newUnit, kind: e.target.value as UnitOption['kind'] })}
                options={UNIT_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-small font-bold">{t('unitForm.preview')}</span>
                <p className="bg-surface-sunken border-line rounded-sm border p-4 text-[15px]">
                  <b>{perUnit(25000, previewOne)}</b> {t('unitForm.onTheTag')} ·{' '}
                  <b>{units(12, previewOne, previewMany)}</b> {t('unitForm.left')}
                </p>
              </div>
              <Button type="submit">{t('unitForm.submit')}</Button>
            </Card>
          </div>
        </div>
      )}

      <Dialog
        open={removing !== null}
        tone="danger"
        title={removing ? t('removeCategory.title', { name: removing.name }) : ''}
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t('removeCategory.keep')}
            </Button>
            <Button variant="danger" onClick={removeCategory} disabled={busyId !== null}>
              {t('removeCategory.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            {removing?.count ? t('removeCategory.textUsed', { count: removing.count }) : t('removeCategory.textUnused')}
          </p>
          {Boolean(removing?.count) && (
            <SelectField
              id="move-products-to"
              label={t('removeCategory.moveTo')}
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              options={categories.filter((c) => c.id !== removing?.id).map((c) => c.name)}
            />
          )}
        </div>
      </Dialog>

      <Dialog
        open={merging !== null}
        title={merging ? t('mergeUnit.title', { name: merging.one }) : ''}
        onClose={() => setMerging(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setMerging(null)}>
              {t('mergeUnit.cancel')}
            </Button>
            <Button
              onClick={() => {
                Notification.success({ text: t('toast.merged') });
                setMerging(null);
              }}
            >
              {t('mergeUnit.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('mergeUnit.text')}</p>
          <SelectField
            id="merge-into"
            label={t('mergeUnit.into')}
            value={mergeInto}
            onChange={(e) => setMergeInto(e.target.value)}
            options={UNIT_LIST.filter((u) => u.builtin).map((u) => u.one)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCategoriesPage;
