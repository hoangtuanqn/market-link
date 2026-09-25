import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import RatingInput from '@/components/RatingInput';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { farmerName, lineProduct, orders } from '@/data/customer';
import { units } from '@/lib/format';
import Notification from '@/utils/notification';

/** FR-050 FR-051 D-10 — one review per order for the stall, and one per product in it. */
const CustomerReviewPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const order = orders.find((o) => o.code.replace('#', '') === code);

  const [stallRating, setStallRating] = useState(0);
  const [stallComment, setStallComment] = useState('');
  const [productRatings, setProductRatings] = useState<Record<number, number>>({});
  const [productComments, setProductComments] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  if (!order) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">That order is not here any more</h1>
        <p className="text-ink-muted">You may have cancelled it, or the link is old. Open it again from your orders.</p>
        <ButtonLink to="/orders">My orders</ButtonLink>
      </div>
    );
  }

  const stallName = farmerName(order.farmerId);
  const completedAt = order.history[order.history.length - 1][1];

  const onPublish = () => {
    Notification.success({ title: 'Review published', text: `Thanks. Your review of ${stallName} is live.` });
    navigate('/orders');
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          My orders
        </Link>{' '}
        · Order {order.code} · Review
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">Completed {completedAt}</p>
        <h1 className="font-hand text-h1">How was {stallName}?</h1>
        <p className="text-body">
          Reviews are tied to this completed order, so other customers see them as a verified purchase. The stall can
          reply.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">The stall</h2>
          <RatingInput legend={`Rate ${stallName}`} name="rs" value={stallRating} onChange={setStallRating} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c1" className="text-small font-bold">
              Comment
            </label>
            <textarea
              id="c1"
              value={stallComment}
              onChange={(e) => setStallComment(e.target.value)}
              placeholder="Was it ready on time? Was the stall easy to find?"
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
          </div>
        </Card>

        {order.items.map((line) => {
          const p = lineProduct(line.productId);
          if (!p) return null;
          const isSkipped = skipped[line.productId] ?? false;
          return (
            <Card key={line.productId} className="flex flex-col gap-4 p-6">
              <h2 className="text-h3">
                {p.name} · {units(line.qty, p.unit)}
              </h2>
              {!isSkipped && (
                <>
                  <RatingInput
                    legend={`Rate ${p.name}`}
                    name={`rp${line.productId}`}
                    value={productRatings[line.productId] ?? 0}
                    onChange={(v) => setProductRatings((prev) => ({ ...prev, [line.productId]: v }))}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`c-${line.productId}`} className="text-small font-bold">
                      Comment
                    </label>
                    <textarea
                      id={`c-${line.productId}`}
                      value={productComments[line.productId] ?? ''}
                      onChange={(e) => setProductComments((prev) => ({ ...prev, [line.productId]: e.target.value }))}
                      placeholder="Taste, freshness, portion size"
                      className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                    />
                  </div>
                </>
              )}
              <Checkbox
                id={`skip-${line.productId}`}
                checked={isSkipped}
                onChange={(e) => setSkipped((prev) => ({ ...prev, [line.productId]: e.target.checked }))}
              >
                Skip this product
              </Checkbox>
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onPublish} disabled={stallRating === 0}>
            Publish review
          </Button>
          <Link to="/orders" className="text-small text-brand underline">
            Not now
          </Link>
        </div>
        <p className="text-ink-muted text-[13px]">One review per order for the stall, and one per product in it.</p>
      </div>
    </div>
  );
};

export default CustomerReviewPage;
