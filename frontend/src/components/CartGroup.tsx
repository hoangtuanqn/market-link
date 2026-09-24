import QtyStepper from '@/components/QtyStepper';
import { Card } from '@/components/ui/card';
import { vnd } from '@/lib/format';

export type CartLineType = { id: number; name: string; unit: string; price: number; max: number; qty: number };

type CartGroupProps = {
  index: number;
  of: number;
  stallName: string;
  where: string;
  items: CartLineType[];
  onQtyChange: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
};

/** One order = one Farmer (D-01) — design system `.ml-cart`. */
const CartGroup = ({ index, of, stallName, where, items, onQtyChange, onRemove }: CartGroupProps) => {
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <Card className="w-full overflow-hidden">
      <div className="border-line-strong flex items-start justify-between gap-3 border-b-[1.5px] border-dashed p-4">
        <div>
          <div className="text-ink-muted text-small">
            Order {index} of {of}
          </div>
          <h3 className="mt-0.5 text-[18px] font-bold">{stallName}</h3>
          <p className="text-small text-ink-muted mt-0.5">{where}</p>
        </div>
      </div>

      <ul className="m-0 flex flex-col p-0 px-4">
        {items.map((it) => (
          <li
            key={it.id}
            className="border-line-strong grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-dotted py-3 last:border-b-0 max-[480px]:grid-cols-[1fr_auto]"
          >
            <span className="font-bold">
              {it.name}
              <span className="text-ink-muted block text-[13px] font-normal">
                {vnd(it.price)} / {it.unit}{' '}
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="text-brand cursor-pointer bg-transparent font-bold underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </span>
            </span>
            <QtyStepper value={it.qty} max={it.max} unit={it.unit} onChange={(qty) => onQtyChange(it.id, qty)} />
            <span className="text-price min-w-22 text-right font-bold tabular-nums max-[480px]:col-span-full max-[480px]:-mt-1 max-[480px]:text-left">
              {vnd(it.qty * it.price)}
            </span>
          </li>
        ))}
      </ul>

      <div className="bg-surface-sunken flex flex-wrap items-center justify-between gap-3 p-3 px-4">
        <span className="text-ink-muted text-small">Pay at the stall on pickup</span>
        <span className="font-hand text-price text-[28px] tabular-nums">{vnd(total)}</span>
      </div>
    </Card>
  );
};

export default CartGroup;
