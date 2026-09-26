import { useRef, useState, type ChangeEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi, { type ProductInput } from '@/api-requests/product.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { UNITS, pluralOf } from '@/constants/units';
import useRequest from '@/hooks/useRequest';
import { perUnit, units } from '@/lib/format';
import type { ProductStatus, ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const STATUS_OPTIONS: ProductStatus[] = ['available', 'sold_out', 'unavailable'];

type FormState = {
  name: string;
  categoryId: number | null;
  unitChoice: string;
  price: number;
  qty: number;
  desc: string;
  imageUrl: string;
  status: ProductStatus;
  /** Days the product stays fresh — no FR yet, see migration V20260926016. */
  shelfLife: number | '';
};
type FormErrors = Partial<Record<'name' | 'cat' | 'price' | 'qty' | 'image' | 'shelfLife', string>>;

/** Contract §5 field names → this form's field ids. */
const SERVER_FIELDS: Record<string, keyof FormErrors> = {
  name: 'name',
  categoryId: 'cat',
  price: 'price',
  stockQuantity: 'qty',
  imageUrl: 'image',
  shelfLifeDays: 'shelfLife',
};

const EMPTY: FormState = {
  name: '',
  categoryId: null,
  unitChoice: 'bunch',
  price: 0,
  qty: 0,
  desc: '',
  imageUrl: '',
  status: 'available',
  shelfLife: '',
};

const fromProduct = (p: ProductType): FormState => {
  return {
    name: p.name,
    categoryId: p.categoryId ?? null,
    unitChoice: p.unit,
    price: p.price,
    qty: p.stock,
    desc: p.desc ?? '',
    imageUrl: p.imageUrl ?? '',
    status: p.status,
    shelfLife: p.shelfLifeDays ?? '',
  };
};

/** FR-062 — add or edit one product: name, category, unit (built-in or the stall's own), price, quantity, description. */
const FarmerProductFormPage = () => {
  const { t } = useTranslation('FarmerProductForm');
  const { t: tc } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = id != null;
  const productId = Number(id);
  const validId = !editing || (Number.isInteger(productId) && productId > 0);

  const { state: load, retry } = useRequest(`my-product:${id ?? 'new'}`, () =>
    editing ? (validId ? ProductApi.getMine(productId) : Promise.reject(new Error('missing'))) : Promise.resolve(null),
  );
  /** The server's 404, or an id that could never be one — the "not here any more" page, not the error block. */
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'PRODUCT_NOT_FOUND');
  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : [];
  const existing = load.kind === 'ready' ? load.data : null;

  // The form mirrors the loaded product until something is typed, then it is its own state.
  const loadedForm = existing ? fromProduct(existing) : EMPTY;
  const [edited, setEdited] = useState<FormState | null>(null);
  const form = edited ?? loadedForm;
  const setForm = (patch: Partial<FormState>) => setEdited({ ...form, ...patch });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // In-flight upload only, never persisted: a skeleton tile until the URL lands in form.imageUrl.
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (load.kind === 'loading') {
    return <MarketCardSkeleton count={1} />;
  }
  if (load.kind === 'error' && !missing) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }
  if (missing) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/farmer/products">{t('products')}</ButtonLink>
      </div>
    );
  }

  const categoryId = form.categoryId ?? categories[0]?.id ?? null;
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryName = selectedCategory?.name ?? '';
  // Soft guidance only (user decision 2026-09-26): outside the range still saves, Farmer is on the hook for it.
  const shelfLifeOutOfRange =
    selectedCategory != null &&
    form.shelfLife !== '' &&
    (form.shelfLife < selectedCategory.minShelfLifeDays || form.shelfLife > selectedCategory.maxShelfLifeDays);
  const [unitOne, unitMany] = [form.unitChoice, pluralOf(form.unitChoice)];
  // A product saved with a unit outside the fixed list keeps it selectable, so editing never changes it silently.
  const unitOptions = UNITS.some((u) => u.one === form.unitChoice)
    ? UNITS.map((u) => u.one)
    : [form.unitChoice, ...UNITS.map((u) => u.one)];

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = t('errors.required');
    if (categoryId == null) next.cat = t('errors.required');
    if (!Number.isFinite(form.price) || form.price < 0) next.price = t('errors.price');
    if (!Number.isInteger(form.qty) || form.qty < 0) next.qty = t('qty.error');
    if (form.shelfLife === '' || !Number.isInteger(form.shelfLife) || form.shelfLife < 1) {
      next.shelfLife = t('shelfLife.error');
    }
    return next;
  };

  /** Uploads right away on choosing a file (docs/prototype pattern), replacing whatever photo was there before. */
  const onImageChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await ProductApi.uploadProductImage(file);
      setForm({ imageUrl: url });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async () => {
    if (uploadingImage) {
      Notification.error({ text: t('photo.uploadInProgress') });
      return;
    }
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length || categoryId == null || form.shelfLife === '') return;
    const input: ProductInput = {
      categoryId,
      name: form.name.trim(),
      description: form.desc.trim() || undefined,
      price: form.price,
      unit: unitOne.slice(0, 20),
      stockQuantity: form.qty,
      imageUrl: form.imageUrl.trim() || undefined,
      shelfLifeDays: form.shelfLife,
    };
    setSaving(true);
    try {
      const saved = existing ? await ProductApi.update(existing.id, input) : await ProductApi.create(input);
      // Status is its own endpoint (FR-064); only call it when the chips changed it.
      if (saved.status !== form.status) await ProductApi.setStatus(saved.id, form.status);
      Notification.success({ title: t('toast.saved'), text: t('toast.savedText', { name: saved.name }) });
      navigate('/farmer/products');
    } catch (error) {
      const mapped: FormErrors = {};
      Object.entries(Helper.getFieldErrors(error)).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      if (Object.keys(mapped).length) setErrors(mapped);
      else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await ProductApi.remove(existing.id);
      Notification.success({ title: t('toast.saved'), text: t('toast.deletedText', { name: existing.name }) });
      navigate('/farmer/products');
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/products" className="text-brand underline">
          {t('products')}
        </Link>{' '}
        · {editing ? t('crumb.edit') : t('crumb.add')}
      </p>

      <h1 className="font-hand text-h1">{existing ? existing.name : t('addTitle')}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
        className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-6 rounded-md border-[1.5px] p-6"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id="name"
              label={t('name.label')}
              required
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              hint={t('name.hint')}
              error={errors.name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="cat"
              label={t('category.label')}
              required
              value={categoryId == null ? '' : String(categoryId)}
              onChange={(e) => setForm({ categoryId: Number(e.target.value) })}
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            />
            <span className={errors.cat ? 'text-danger text-[13px]' : 'text-ink-muted text-[13px]'}>
              {errors.cat ?? t('category.hint')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="unit"
              label={t('unit.label')}
              required
              value={form.unitChoice}
              onChange={(e) => setForm({ unitChoice: e.target.value })}
              options={unitOptions}
            />
            <span className="text-ink-muted text-[13px]">{t('unit.hint')}</span>
          </div>

          <div className="md:col-span-2">
            <Banner variant="info" title={t('preview.label')}>
              <Trans
                t={t}
                i18nKey="preview.text"
                values={{
                  price: perUnit(form.price, unitOne),
                  left: units(12, unitOne, unitMany),
                  one: units(1, unitOne, unitMany),
                }}
                components={{ b: <b /> }}
              />
            </Banner>
          </div>

          <Field
            id="price"
            label={t('price.label')}
            required
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ price: Math.max(0, Number(e.target.value) || 0) })}
            hint={t('price.hint', { price: perUnit(form.price, unitOne) })}
            error={errors.price}
          />
          <Field
            id="qty"
            label={t('qty.label')}
            required
            inputMode="numeric"
            value={form.qty}
            onChange={(e) => setForm({ qty: Number(e.target.value) || 0 })}
            error={errors.qty}
          />

          <div className="flex flex-col gap-1.5">
            <Field
              id="shelf-life"
              label={t('shelfLife.label')}
              required
              inputMode="numeric"
              value={form.shelfLife}
              onChange={(e) => {
                const raw = e.target.value;
                setForm({ shelfLife: raw === '' ? '' : Math.max(0, Number(raw) || 0) });
              }}
              hint={
                selectedCategory
                  ? t('shelfLife.hint', {
                      min: selectedCategory.minShelfLifeDays,
                      max: selectedCategory.maxShelfLifeDays,
                    })
                  : undefined
              }
              error={errors.shelfLife}
            />
            {shelfLifeOutOfRange && selectedCategory && (
              <Banner variant="warning" title={t('shelfLife.warningTitle')}>
                {t('shelfLife.warningText', {
                  min: selectedCategory.minShelfLifeDays,
                  max: selectedCategory.maxShelfLifeDays,
                })}
              </Banner>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="desc" className="text-small font-bold">
              {t('desc.label')}
            </label>
            <textarea
              id="desc"
              value={form.desc}
              onChange={(e) => setForm({ desc: e.target.value })}
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
            <span className="text-ink-muted text-[13px]">{t('desc.hint')}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-small font-bold">{t('status.label')}</span>
            <div className="mt-0.5 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => (
                <Chip key={o} pressed={form.status === o} onClick={() => setForm({ status: o })}>
                  {t(`status.${o}`)}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">{t('photo.label')}</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onImageChosen(e)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            {uploadingImage ? (
              <span
                aria-hidden="true"
                role="status"
                aria-label={t('photo.uploading')}
                className="ml-skel aspect-4/3 w-full rounded-md"
              />
            ) : form.imageUrl.trim() ? (
              <div className="relative">
                <img
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${form.imageUrl}`}
                  alt={t('photo.alt')}
                  className="border-line aspect-4/3 w-full rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm({ imageUrl: '' })}
                  className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                  aria-label={t('photo.remove')}
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="border-line bg-surface-sunken text-ink-muted font-hand flex aspect-4/3 w-full items-center justify-center rounded-md border p-2 text-center">
                {categoryName}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {form.imageUrl.trim() ? t('photo.replace') : t('photo.add')}
              </Button>
              <p className="text-caption text-ink-muted">{t('photo.hint')}</p>
              {errors.image && (
                <p role="alert" className="text-danger m-0 text-[13px]">
                  {errors.image}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-line-strong flex flex-wrap items-center gap-2 border-t-[1.5px] pt-4">
          <Button type="submit" disabled={saving}>
            {editing ? t('save') : t('add')}
          </Button>
          <ButtonLink variant="secondary" to="/farmer/products">
            {t('cancel')}
          </ButtonLink>
          {existing && (
            <Button type="button" variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              {t('delete.button')}
            </Button>
          )}
        </div>
      </form>

      {existing && (
        <Dialog
          open={deleteOpen}
          title={t('delete.title', { name: existing.name })}
          tone="danger"
          onClose={() => setDeleteOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                {t('delete.keep')}
              </Button>
              <Button variant="danger" onClick={() => void remove()} disabled={saving}>
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
