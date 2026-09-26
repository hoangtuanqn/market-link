import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi, { type CategoryType } from '@/api-requests/catalog.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type CategoryRow = CategoryType;
const NO_CATEGORIES: CategoryRow[] = [];
const PAGE_SIZE = 8;

const bySortThenName = (a: CategoryRow, b: CategoryRow) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

type NewCategoryErrors = Partial<Record<'name' | 'min' | 'max', string>>;

/**
 * FR-076 — the one list every stall picks from when it adds a product. Sale units are not here: the SRS gives the admin
 * "product categories" and nothing else as master data, so units ship as a fixed list in `constants/units.ts`. Reads
 * and writes go through `/api/v1/categories` and `/api/v1/admin/categories` (contract §5).
 */
const AdminCategoriesPage = () => {
  const { t } = useTranslation('AdminCategories');
  const { t: tc } = useTranslation();

  const { state: load, retry, mutate } = useRequest('categories', () => CatalogApi.listCategories());
  const categories = load.kind === 'ready' ? load.data : NO_CATEGORIES;
  const replaceCategories = (next: (current: CategoryRow[]) => CategoryRow[]) =>
    mutate((current) => next(current).sort(bySortThenName));

  const [newCategory, setNewCategory] = useState({ name: '', position: '', minShelfLife: '', maxShelfLife: '' });
  const [newCategoryErrors, setNewCategoryErrors] = useState<NewCategoryErrors>({});
  /** Names typed into the table but not saved yet, by category id. */
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCategories = categories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const saveCategory = async (c: CategoryRow) => {
    const name = (drafts[c.id] ?? c.name).trim();
    if (!name) return;
    setBusyId(c.id);
    try {
      const saved = await CatalogApi.updateCategory(c.id, {
        name,
        sortOrder: c.sortOrder,
        minShelfLifeDays: c.minShelfLifeDays,
        maxShelfLifeDays: c.maxShelfLifeDays,
      });
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
    const min = Number(newCategory.minShelfLife);
    const max = Number(newCategory.maxShelfLife);
    const errors: NewCategoryErrors = {};
    if (!name) errors.name = t('error.nameRequired');
    if (!Number.isInteger(min) || min < 1) errors.min = t('error.shelfLifeRequired');
    if (!Number.isInteger(max) || max < 1) errors.max = t('error.shelfLifeRequired');
    else if (!errors.min && max < min) errors.max = t('error.shelfLifeRange');
    setNewCategoryErrors(errors);
    if (Object.keys(errors).length) return;

    const position = Number(newCategory.position);
    setBusyId(0);
    try {
      const created = await CatalogApi.createCategory({
        name,
        sortOrder: Number.isFinite(position) && position > 0 ? position : categories.length + 1,
        minShelfLifeDays: min,
        maxShelfLifeDays: max,
      });
      replaceCategories((list) => [...list, created]);
      Notification.success({ text: t('toast.categoryAdded') });
      setNewCategory({ name: '', position: '', minShelfLife: '', maxShelfLife: '' });
    } catch (error) {
      const fromServer = Helper.getFieldErrors(error);
      const mapped: NewCategoryErrors = {
        name: fromServer.name,
        min: fromServer.minShelfLifeDays,
        max: fromServer.maxShelfLifeDays,
      };
      if (mapped.name || mapped.min || mapped.max) setNewCategoryErrors(mapped);
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
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
    // Products and stalls per category arrive with reports (C9); until then the column shows a dash.
    { key: 'stalls', label: t('col.stalls'), align: 'num', render: () => '—' },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void saveCategory(c)} disabled={busyId === c.id}>
            {t('action.save')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRemoving(c)} disabled={busyId === c.id}>
            {t('action.remove')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
      </div>

      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex h-full min-h-[440px] flex-1 flex-col">
          {load.kind === 'loading' ? (
            <MarketCardSkeleton count={3} />
          ) : load.kind === 'error' ? (
            <LoadError noun={t('error.noun')} onRetry={retry} />
          ) : categories.length ? (
            <div className="flex h-full flex-1 flex-col gap-4">
              <Table
                className="h-full flex-1"
                caption={t('caption.categories', { count: categories.length })}
                columns={categoryColumns}
                rows={paginatedCategories}
              />
              {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                  <Pagination page={currentPage} pages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>
          ) : (
            <DataState
              fill
              title={t('empty.categories.title')}
              text={t('empty.categories.text')}
              className="h-full min-h-[440px] w-full"
            />
          )}
        </div>

        <Card
          as="form"
          className="flex flex-col gap-4 self-start p-6"
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
            error={newCategoryErrors.name}
          />
          <Field
            id="new-category-position"
            label={t('categoryForm.position')}
            type="number"
            placeholder={String(categories.length + 1)}
            value={newCategory.position}
            onChange={(e) => setNewCategory({ ...newCategory, position: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="new-category-min-shelf-life"
              label={t('categoryForm.minShelfLife')}
              required
              type="number"
              value={newCategory.minShelfLife}
              onChange={(e) => setNewCategory({ ...newCategory, minShelfLife: e.target.value })}
              error={newCategoryErrors.min}
            />
            <Field
              id="new-category-max-shelf-life"
              label={t('categoryForm.maxShelfLife')}
              required
              type="number"
              value={newCategory.maxShelfLife}
              onChange={(e) => setNewCategory({ ...newCategory, maxShelfLife: e.target.value })}
              error={newCategoryErrors.max}
            />
          </div>
          <p className="text-ink-muted text-[13px]">{t('categoryForm.shelfLifeHint')}</p>
          <Button type="submit" disabled={busyId === 0}>
            {t('categoryForm.submit')}
          </Button>
        </Card>
      </div>

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
            <Button variant="danger" onClick={() => void removeCategory()} disabled={busyId !== null}>
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
    </div>
  );
};

export default AdminCategoriesPage;
