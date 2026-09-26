import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { categories, product } from '@/data/catalog';
import { UNITS, pluralOf } from '@/constants/units';
import { perUnit, units } from '@/lib/format';
import type { ProductStatus } from '@/types/product.types';
import Notification from '@/utils/notification';

const STATUS_OPTIONS: ProductStatus[] = ['available', 'sold_out', 'unavailable'];

/** FR-062 — add or edit one product: name, category, unit (built-in or the stall's own), price, quantity, description. */
const FarmerProductFormPage = () => {
  const { t } = useTranslation('FarmerProductForm');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = id != null;
  const existing = editing ? product(Number(id)) : undefined;
  const notFound = editing && !existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? categories[0].name);
  const [unitChoice, setUnitChoice] = useState(existing?.unit ?? 'bunch');
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [qty, setQty] = useState(existing?.stock ?? 0);
  const [desc, setDesc] = useState(existing?.desc ?? '');
  const [flag, setFlag] = useState(existing?.flag ?? '');
  const [status, setStatus] = useState<ProductStatus>(existing?.status ?? 'available');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [unitOne, unitMany] = [unitChoice, pluralOf(unitChoice)];

  const qtyError = qty < 0 ? t('qty.error') : undefined;

  const save = () => {
    Notification.success({ title: t('toast.saved'), text: t('toast.savedText', { name: name || t('toast.product') }) });
    navigate('/farmer/products');
  };

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/farmer/products">{t('products')}</ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/products" className="text-brand underline">
          {t('products')}
        </Link>{' '}
        · {editing ? t('crumb.edit') : t('crumb.add')}
      </p>

      <h1 className="font-hand text-h1">{editing ? existing!.name : t('addTitle')}</h1>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-6 rounded-md border-[1.5px] p-6"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id="name"
              label={t('name.label')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint={t('name.hint')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="cat"
              label={t('category.label')}
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => c.name)}
            />
            <span className="text-ink-muted text-[13px]">{t('category.hint')}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="unit"
              label={t('unit.label')}
              required
              value={unitChoice}
              onChange={(e) => setUnitChoice(e.target.value)}
              options={UNITS.map((u) => u.one)}
            />
            <span className="text-ink-muted text-[13px]">{t('unit.hint')}</span>
          </div>

          <div className="md:col-span-2">
            <span className="text-small text-ink font-bold">{t('preview.label')}</span>
            <p className="border-line-strong bg-surface-raised mt-1.5 rounded-md border-[1.5px] p-4 text-[16px]">
              <Trans
                t={t}
                i18nKey="preview.text"
                values={{
                  price: perUnit(price, unitOne),
                  left: units(12, unitOne, unitMany),
                  one: units(1, unitOne, unitMany),
                }}
                components={{ b: <b /> }}
              />
            </p>
          </div>

          <Field
            id="price"
            label={t('price.label')}
            required
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
            hint={t('price.hint', { price: perUnit(price, unitOne) })}
          />
          <Field
            id="qty"
            label={t('qty.label')}
            required
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            error={qtyError}
          />

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="desc" className="text-small font-bold">
              {t('desc.label')}
            </label>
            <textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
            <span className="text-ink-muted text-[13px]">{t('desc.hint')}</span>
          </div>

          <Field
            id="flag"
            label={t('flag.label')}
            maxLength={24}
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            hint={t('flag.hint')}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-small font-bold">{t('status.label')}</span>
            <div className="mt-0.5 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => (
                <Chip key={o} pressed={status === o} onClick={() => setStatus(o)}>
                  {t(`status.${o}`)}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('photo.label')}</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="border-line bg-surface-sunken text-ink-muted font-hand flex aspect-4/3 w-full items-center justify-center rounded-md border p-2 text-center">
              {category}
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-[15px]">{t('photo.none')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" type="button">
                  {t('photo.choose')}
                </Button>
                <span className="text-caption text-ink-muted">{t('photo.hint')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-line-strong flex flex-wrap items-center gap-2 border-t-[1.5px] pt-4">
          <Button onClick={save} disabled={!!qtyError}>
            {editing ? t('save') : t('add')}
          </Button>
          <ButtonLink variant="secondary" to="/farmer/products">
            {t('cancel')}
          </ButtonLink>
          {editing && (
            <Button variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              {t('delete.button')}
            </Button>
          )}
        </div>
      </form>

      {editing && (
        <Dialog
          open={deleteOpen}
          title={t('delete.title', { name: existing!.name })}
          tone="danger"
          onClose={() => setDeleteOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                {t('delete.keep')}
              </Button>
              <Button variant="danger" onClick={() => navigate('/farmer/products')}>
                {t('delete.button')}
              </Button>
            </>
          }
        >
          <p>{t('delete.text')}</p>
        </Dialog>
      )}
    </div>
  );
};

export default FarmerProductFormPage;
