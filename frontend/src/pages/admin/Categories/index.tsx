import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CatalogApi, { type CategoryType } from '@/api-requests/catalog.requests';
import { CheckIcon, CloseIcon } from '@/components/icons';
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
import CategoryTableSkeleton from './CategoryTableSkeleton';

type CategoryRow = CategoryType;
const NO_CATEGORIES: CategoryRow[] = [];
const PAGE_SIZE = 8;
/** Matches the server cap on categories.name (CategoryRequest, VARCHAR(80)). */
const NAME_MAX = 80;

const bySortThenName = (a: CategoryRow, b: CategoryRow) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

type NewCategoryErrors = Partial<Record<'name' | 'min' | 'max', string>>;

/** Pill for is_active. Colour never carries the meaning alone — each state has its own word and glyph. */
const CategoryStatusPill = ({ active, label }: { active: boolean; label: string }) => (
  <span
    className={Helper.cn(
      'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
      active ? 'bg-status-ready-bg text-status-ready-ink' : 'bg-status-declined-bg text-status-declined-ink',
    )}
  >
    {active ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
    {label}
  </span>
);

/**
 * FR-076 — the one list every stall picks from when it adds a product. Sale units are not here: the SRS gives the admin
 * "product categories" and nothing else as master data, so units ship as a fixed list in `constants/units.ts`. Reads
 * and writes go through `/api/v1/categories` and `/api/v1/admin/categories` (contract §5).
 */
const AdminCategoriesPage = () => {
  const { t } = useTranslation('AdminCategories');
  const { t: tc } = useTranslation();

  const { state: load, retry, mutate } = useRequest('categories', () => CatalogApi.listAllCategoriesAdmin());
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
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

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
    else if (name.length > NAME_MAX) errors.name = t('error.nameTooLong', { max: NAME_MAX });
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
        // A taken name comes back as a 409 without field details; it still belongs under the name field.
        name:
          fromServer.name ?? (Helper.getErrorCode(error) === 'DUPLICATE_CATEGORY' ? t('error.nameTaken') : undefined),
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
      const moveToCategoryId = moveTo ? Number(moveTo) : undefined;
      await CatalogApi.deactivateCategory(removing.id, moveToCategoryId);
      // Reassigning products changes another category's count too — a full reload is simpler and
      // correct than hand-patching every row's count locally.
      retry();
      Notification.success({ text: t('toast.categoryRemoved', { name: removing.name }) });
      setRemoving(null);
      setMoveTo('');
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const enableCategory = async (c: CategoryRow) => {
    setBusyId(c.id);
    try {
      const enabled = await CatalogApi.activateCategory(c.id);
      replaceCategories((list) => list.map((row) => (row.id === c.id ? enabled : row)));
      Notification.success({ text: t('toast.categoryEnabled', { name: enabled.name }) });
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
          className="border-line-strong bg-surface-raised focus:outline-focus min-h-11 w-full max-w-50 rounded-sm border-[1.5px] px-2 focus:outline-2"
        />
      ),
    },
    {
      key: 'shelfLife',
      label: t('col.shelfLife'),
      render: (c) =>
        c.minShelfLifeDays === c.maxShelfLifeDays
          ? t('col.shelfLifeDays', { count: c.minShelfLifeDays })
          : t('col.shelfLifeRange', { min: c.minShelfLifeDays, max: c.maxShelfLifeDays }),
    },
    { key: 'count', label: t('col.products'), align: 'num' },
    // Products and stalls per category arrive with reports (C9); until then the column shows a dash.
    { key: 'stalls', label: t('col.stalls'), align: 'num', render: () => '—' },
    {
      key: 'status',
      label: t('col.status'),
      render: (c) => (
        <CategoryStatusPill active={c.isActive} label={t(c.isActive ? 'status.active' : 'status.inactive')} />
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void saveCategory(c)} disabled={busyId === c.id}>
            {t('action.save')}
          </Button>
          {c.isActive ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setRemoving(c);
                setMoveTo('');
              }}
              disabled={busyId === c.id}
            >
              {t('action.remove')}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void enableCategory(c)} disabled={busyId === c.id}>
              {t('action.enable')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
      </div>

      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* min-w-0: a flex item defaults to min-width:auto, so without it this column grows to the table's
            natural width and the table's own overflow-x-auto never gets a chance to scroll. */}
        <div className="flex h-full min-h-[440px] min-w-0 flex-1 flex-col">
          {load.kind === 'loading' || initialLoading ? (
            <CategoryTableSkeleton />
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
          {/* The fields carry a min width for flex rows; inside this grid the columns set the width, so let
              them shrink — two 220px fields do not fit the 380px sidebar and push the page sideways. */}
          <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
        onClose={() => {
          setRemoving(null);
          setMoveTo('');
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRemoving(null);
                setMoveTo('');
              }}
            >
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
              hint={t('removeCategory.moveToHint')}
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              options={[
                { value: '', label: t('removeCategory.moveToNone') },
                ...categories
                  .filter((c) => c.isActive && c.id !== removing?.id)
                  .map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCategoriesPage;
