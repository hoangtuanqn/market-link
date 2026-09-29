import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import OrderApi, { toOrder } from '@/api-requests/order.requests';
import ReviewApi from '@/api-requests/review.requests';
import RatingInput from '@/components/RatingInput';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { formatDate, units } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const isGone = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);

const CustomerReviewPage = () => {
  const { t } = useTranslation('CustomerReview');
  const { t: tc } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const id = Number(code);

  const { state, retry } = useRequest(`order:${id}`, () => OrderApi.get(id));

  const [stallRating, setStallRating] = useState(0);
  const [stallComment, setStallComment] = useState('');
  const [productRatings, setProductRatings] = useState<Record<number, number>>({});
  const [productComments, setProductComments] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  if (state.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (state.kind === 'error' && isGone(state.error)) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notFound.title')}</h1>
        <p className="text-ink-muted">{t('notFound.text')}</p>
        <ButtonLink to="/orders">{t('myOrders')}</ButtonLink>
      </div>
    );
  }

  if (state.kind === 'error') {
    return <LoadError noun={t('noun')} onRetry={retry} />;
  }

  const data = state.data;
  const order = toOrder(data);

  if (order.status !== 'completed') {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('notCompleted.title')}</h1>
        <p className="text-ink-muted">{t('notCompleted.text')}</p>
        <ButtonLink to={`/orders/${id}`}>{t('breadcrumbOrder', { code: order.code })}</ButtonLink>
      </div>
    );
  }

  if (order.reviewed) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('done.title')}</h1>
        <p className="text-ink-muted">{t('done.text')}</p>
        <ButtonLink to={`/orders/${id}`}>{t('breadcrumbOrder', { code: order.code })}</ButtonLink>
      </div>
    );
  }

  const completedAt = data.statusHistory.at(-1)?.changedAt;

  const onPublish = async () => {
    setSubmitting(true);
    const calls: Promise<unknown>[] = [];
    if (stallRating > 0) {
      calls.push(
        ReviewApi.create({
          orderId: id,
          targetType: 'farmer',
          farmerId: order.farmerId,
          rating: stallRating,
          comment: stallComment || undefined,
        }),
      );
    }
    order.items.forEach((l) => {
      const r = productRatings[l.productId] ?? 0;
      if (!skipped[l.productId] && r > 0) {
        calls.push(
          ReviewApi.create({
            orderId: id,
            targetType: 'product',
            productId: l.productId,
            rating: r,
            comment: productComments[l.productId] || undefined,
          }),
        );
      }
    });
    const results = await Promise.allSettled(calls);
    const failed = results.filter(
      (r) => r.status === 'rejected' && !(isAxiosError(r.reason) && r.reason.response?.status === 409),
    );
    if (failed.length) {
      const first = failed[0] as PromiseRejectedResult;
      Notification.error({ text: Helper.getErrorMessage(first.reason, tc('errors.network')) });
      setSubmitting(false);
    } else {
      Notification.success({ title: t('toast.title'), text: t('toast.text', { stall: order.stallName }) });
      navigate(`/orders/${id}`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/orders" className="text-brand underline">
          {t('myOrders')}
        </Link>{' '}
        · {t('breadcrumbOrder', { code: order.code })} · {t('breadcrumbReview')}
      </p>

      <div className="flex flex-col gap-2">
        {completedAt ? (
          <p className="font-hand text-hand text-ink-muted">
            {t('completed', { date: formatDate(new Date(completedAt)) })}
          </p>
        ) : null}
        <h1 className="font-hand text-h1">{t('title', { stall: order.stallName })}</h1>
        <p className="text-body">{t('intro')}</p>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">{t('stall.title')}</h2>
          <RatingInput
            legend={t('rate', { name: order.stallName })}
            name="rs"
            value={stallRating}
            onChange={setStallRating}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c1" className="text-small font-bold">
              {t('comment')}
            </label>
            <textarea
              id="c1"
              value={stallComment}
              onChange={(e) => setStallComment(e.target.value)}
              placeholder={t('stall.placeholder')}
              className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
            />
          </div>
        </Card>

        {order.items.map((line) => {
          const isSkipped = skipped[line.productId] ?? false;
          return (
            <Card key={line.productId} className="flex flex-col gap-4 p-6">
              <h2 className="text-h3">
                {line.name} · {units(line.qty, line.unit)}
              </h2>
              {!isSkipped && (
                <>
                  <RatingInput
                    legend={t('rate', { name: line.name })}
                    name={`rp${line.productId}`}
                    value={productRatings[line.productId] ?? 0}
                    onChange={(v) => setProductRatings((prev) => ({ ...prev, [line.productId]: v }))}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`c-${line.productId}`} className="text-small font-bold">
                      {t('comment')}
                    </label>
                    <textarea
                      id={`c-${line.productId}`}
                      value={productComments[line.productId] ?? ''}
                      onChange={(e) => setProductComments((prev) => ({ ...prev, [line.productId]: e.target.value }))}
                      placeholder={t('product.placeholder')}
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
                {t('product.skip')}
              </Checkbox>
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void onPublish()} disabled={stallRating === 0 || submitting}>
            {t('submit')}
          </Button>
          <Link to="/orders" className="text-small text-brand underline">
            {t('notNow')}
          </Link>
        </div>
        <p className="text-ink-muted text-[13px]">{t('note')}</p>
      </div>
    </div>
  );
};

export default CustomerReviewPage;
