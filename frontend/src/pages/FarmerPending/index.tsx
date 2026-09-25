import { useState } from 'react';
import { Link } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { farmer, marketName } from '@/data/catalog';

const pending = farmer(9)!;
const suspended = farmer(10)!;
/** Not modeled anywhere else — a one-off fact for this screen, same as the prototype's own literal date. */
const SUSPENDED_ON = '20/09/2026';

/** FR-071 — what a Farmer sees before approval, or after being suspended. */
const FarmerPendingPage = () => {
  const [preview, setPreview] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">
            {preview
              ? `${suspended.stall} · suspended ${SUSPENDED_ON}`
              : `${pending.stall} · registered ${pending.registered}`}
          </p>
          <h1 className="font-hand text-h1">
            {preview ? 'Your stall is suspended' : 'Your stall is waiting for approval'}
          </h1>
        </div>
        <Chip pressed={preview} onClick={() => setPreview((v) => !v)}>
          Preview: suspended stall
        </Chip>
      </div>

      {!preview ? (
        <div className="flex flex-col gap-6">
          <Banner variant="info" title="An admin is reviewing your registration.">
            You will get a notification and an email when it is approved. Until then your stall and products are not
            visible to customers.
          </Banner>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">What you can do now</h2>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[16px]">
              <li>
                Fill in your{' '}
                <Link to="/farmer/stall" className="text-brand underline">
                  stall details
                </Link>
                , the markets you sell at, your days and pickup windows.
              </li>
              <li>Pin your stall on the map so customers can find you on day one.</li>
              <li>
                Products can be added once the stall is approved. Prepare names, prices and photos in the meantime.
              </li>
            </ul>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Registration details</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Stall</dt>
              <dd className="m-0">{pending.stall}</dd>
              <dt className="text-ink-muted">Contact</dt>
              <dd className="m-0">
                {pending.person} · {pending.phone}
              </dd>
              <dt className="text-ink-muted">Email</dt>
              <dd className="m-0">{pending.email}</dd>
              <dt className="text-ink-muted">Market requested</dt>
              <dd className="m-0">{marketName(pending.markets[0])}</dd>
            </dl>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Banner variant="danger" title={`Your stall was suspended on ${SUSPENDED_ON}.`}>
            Reason from the admin: {suspended.suspendedReason} Your products are hidden and you cannot take new orders.
          </Banner>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Orders already placed still run</h2>
            <p className="text-[16px]">
              Customers who ordered before the suspension keep their orders (D-09). Mark them ready and completed as
              usual so nobody loses what they reserved.
            </p>
            <ButtonLink to="/farmer/orders" className="self-start">
              Open current orders
            </ButtonLink>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">To be reinstated</h2>
            <p className="text-[15px]">
              Contact the team through{' '}
              <Link to="/contact" className="text-brand underline">
                Contact us
              </Link>
              .
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FarmerPendingPage;
