import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_ANNOUNCEMENTS_PATH, ADMIN_FEEDBACK_PATH } from '@/constants/nav';
import { categories, farmers, products } from '@/data/catalog';
import Notification from '@/utils/notification';

type CategoryRow = (typeof categories)[number];

/**
 * FR-076 — the one list every stall picks from when it adds a product. Sale units are not here: the SRS gives the admin
 * "product categories" and nothing else as master data, so units ship as a fixed list in `constants/units.ts`.
 */
const AdminCategoriesPage = () => {
  const { t } = useTranslation('AdminCategories');

  const [newCategory, setNewCategory] = useState({ name: '', position: String(categories.length + 1) });
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [moveTo, setMoveTo] = useState('');

  /** How many stalls have at least one product in this category. */
  const stallsIn = (categoryName: string) =>
    farmers.filter((f) => products.some((p) => p.farmerId === f.id && p.category === categoryName)).length;

  const categoryColumns: TableColumn<CategoryRow>[] = [
    {
      key: 'name',
      label: t('col.category'),
      render: (c) => (
        <input
          defaultValue={c.name}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => Notification.success({ text: t('toast.categorySaved', { name: c.name }) })}
          >
            {t('action.save')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRemoving(c)}>
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {categories.length ? (
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
            Notification.success({ text: t('toast.categoryAdded') });
            setNewCategory({ name: '', position: String(categories.length + 1) });
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
          />
          <Field
            id="new-category-position"
            label={t('categoryForm.position')}
            type="number"
            value={newCategory.position}
            onChange={(e) => setNewCategory({ ...newCategory, position: e.target.value })}
          />
          <Button type="submit">{t('categoryForm.submit')}</Button>
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
            <Button
              variant="danger"
              onClick={() => {
                if (removing) Notification.success({ text: t('toast.categoryRemoved', { name: removing.name }) });
                setRemoving(null);
              }}
            >
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
