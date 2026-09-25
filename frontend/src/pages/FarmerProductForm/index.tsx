import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { categories, product } from '@/data/catalog';
import { UNIT_LIST } from '@/data/units';
import { guessPlural, units, vnd } from '@/lib/format';
import type { ProductStatus } from '@/types/product.types';
import Notification from '@/utils/notification';

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'unavailable', label: 'Paused' },
];

const OWN_UNIT = '__own';

/** FR-062 — add or edit one product: name, category, unit (built-in or the stall's own), price, quantity, description. */
const FarmerProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = id != null;
  const existing = editing ? product(Number(id)) : undefined;
  const notFound = editing && !existing;

  const knownUnit = existing && UNIT_LIST.some((u) => u.one === existing.unit);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? categories[0].name);
  const [unitChoice, setUnitChoice] = useState(existing && !knownUnit ? OWN_UNIT : (existing?.unit ?? 'bunch'));
  const [ownOne, setOwnOne] = useState(existing && !knownUnit ? existing.unit : '');
  const [ownMany, setOwnMany] = useState(existing && !knownUnit ? (existing.plural ?? '') : '');
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [qty, setQty] = useState(existing?.stock ?? 0);
  const [desc, setDesc] = useState(existing?.desc ?? '');
  const [flag, setFlag] = useState(existing?.flag ?? '');
  const [status, setStatus] = useState<ProductStatus>(existing?.status ?? 'available');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [unitOne, unitMany] =
    unitChoice === OWN_UNIT
      ? [ownOne.trim() || 'unit', ownMany.trim() || guessPlural(ownOne.trim() || 'unit')]
      : [unitChoice, UNIT_LIST.find((u) => u.one === unitChoice)?.many ?? guessPlural(unitChoice)];

  const qtyError = qty < 0 ? 'Quantity must be 0 or more. Use Sold out for none left.' : undefined;

  const save = () => {
    Notification.success({ title: 'Saved', text: `${name || 'Product'} saved.` });
    navigate('/farmer/products');
  };

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That product is not here any more</h1>
        <p className="text-ink-muted">It may have been deleted. Open it again from your products list.</p>
        <ButtonLink to="/farmer/products">Products</ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/products" className="text-brand underline">
          Products
        </Link>{' '}
        · {editing ? 'Edit' : 'Add'}
      </p>

      <h1 className="font-hand text-h1">{editing ? existing!.name : 'Add a product'}</h1>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-6 rounded-md border-[1.5px] p-6"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id="name"
              label="Product name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint={'In English, with the place or variety if it matters: “Củ Chi water spinach”, “Green-skin pomelo”.'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="cat"
              label="Category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => c.name)}
            />
            <span className="text-ink-muted text-[13px]">Categories are managed by the admin.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              id="unit"
              label="Sold per"
              required
              value={unitChoice}
              onChange={(e) => setUnitChoice(e.target.value)}
              options={[
                ...UNIT_LIST.map((u) => ({ value: u.one, label: u.builtin ? u.one : `${u.one} · added by a stall` })),
                { value: OWN_UNIT, label: 'Name your own unit…' },
              ]}
            />
            <span className="text-ink-muted text-[13px]">
              How a customer buys it: by the kilo, the bunch, the bulb, the bag. Pick one or name your own.
            </span>
          </div>

          {unitChoice === OWN_UNIT && (
            <div className="flex flex-col gap-1.5">
              <span className="text-small text-ink font-bold">
                Your unit<span className="text-danger ml-0.5">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <input
                  value={ownOne}
                  onChange={(e) => setOwnOne(e.target.value)}
                  placeholder="tray of 30"
                  aria-label="Unit, one of them"
                  className="border-line-strong bg-surface-raised min-h-11 min-w-40 flex-1 rounded-sm border-[1.5px] px-3"
                />
                <input
                  value={ownMany}
                  onChange={(e) => setOwnMany(e.target.value)}
                  placeholder={guessPlural(ownOne.trim() || 'unit')}
                  aria-label="Unit, more than one"
                  className="border-line-strong bg-surface-raised min-h-11 min-w-40 flex-1 rounded-sm border-[1.5px] px-3"
                />
              </div>
              <span className="text-ink-muted text-[13px]">
                One of them, then more than one. We fill the second in for you; change it if the guess is wrong.
              </span>
            </div>
          )}

          <div className="md:col-span-2">
            <span className="text-small text-ink font-bold">How it will read</span>
            <p className="border-line-strong bg-surface-raised mt-1.5 rounded-md border-[1.5px] p-4 text-[16px]">
              <b>
                {vnd(price)} / {unitOne}
              </b>{' '}
              on the tag · <b>{units(12, unitOne, unitMany)}</b> left · someone ordering one sees{' '}
              <b>{units(1, unitOne, unitMany)}</b>
            </p>
          </div>

          <Field
            id="price"
            label="Price in ₫"
            required
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
            hint={`Shown as ${vnd(price)} / ${unitOne}.`}
          />
          <Field
            id="qty"
            label="Quantity available this week"
            required
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            error={qtyError}
          />

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="desc" className="text-small font-bold">
              Description
            </label>
            <textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
            <span className="text-ink-muted text-[13px]">
              Shown on the product page. Say how it is grown and how to keep it.
            </span>
          </div>

          <Field
            id="flag"
            label="Short tag on the card"
            maxLength={24}
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            hint={'Optional, hand-lettered on the tag: “Fresh today”, “Baked at 5am”.'}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-small font-bold">Status</span>
            <div className="mt-0.5 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => (
                <Chip key={o.value} pressed={status === o.value} onClick={() => setStatus(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small font-bold">Photo</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="border-line bg-surface-sunken text-ink-muted font-hand flex aspect-4/3 w-full items-center justify-center rounded-md border p-2 text-center">
              {category}
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-[15px]">No photo yet. Until you add one, the tag shows the category in handwriting.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" type="button">
                  Choose photo
                </Button>
                <span className="text-caption text-ink-muted">
                  JPG or PNG, 4:3, up to 5 MB. Close up, natural light, on wood or paper.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-line-strong flex flex-wrap items-center gap-2 border-t-[1.5px] pt-4">
          <Button onClick={save} disabled={!!qtyError}>
            {editing ? 'Save product' : 'Add product'}
          </Button>
          <ButtonLink variant="secondary" to="/farmer/products">
            Cancel
          </ButtonLink>
          {editing && (
            <Button variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              Delete product
            </Button>
          )}
        </div>
      </form>

      {editing && (
        <Dialog
          open={deleteOpen}
          title={`Delete ${existing!.name}?`}
          tone="danger"
          onClose={() => setDeleteOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                Keep product
              </Button>
              <Button variant="danger" onClick={() => navigate('/farmer/products')}>
                Delete product
              </Button>
            </>
          }
        >
          <p>
            It disappears from the catalogue and from your template. Orders that already include it are not changed.
          </p>
        </Dialog>
      )}
    </div>
  );
};

export default FarmerProductFormPage;
