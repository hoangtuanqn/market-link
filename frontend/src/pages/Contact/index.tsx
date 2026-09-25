import MarketMap from '@/components/MarketMap';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Helper from '@/utils/helper';

const TEAM_LAT = 10.7769;
const TEAM_LNG = 106.7009;

/** FR-083 — how to reach the MarketLink team, separate from a stall's own contact on an order. */
const ContactPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Contact us</h1>
        <p className="text-body-lg max-w-155">
          Questions about an order go to the stall directly; their phone number is on your order. For anything about the
          platform, reach the team here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h2">The MarketLink team</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Email</dt>
              <dd className="m-0">To add</dd>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="m-0">To add</dd>
              <dt className="text-ink-muted">Address</dt>
              <dd className="m-0">To add. The pin on the map is a placeholder in District 1.</dd>
              <dt className="text-ink-muted">Hours</dt>
              <dd className="m-0">Mon – Fri, 09:00 – 17:00</dd>
            </dl>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">Something broken or an idea?</h2>
            <p className="text-[15px]">
              Use the feedback form so it lands in the right queue, with the page and your browser attached.
            </p>
            <ButtonLink to="/feedback" variant="secondary" className="self-start">
              Send feedback
            </ButtonLink>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <MarketMap
            label="Map of the team location"
            className="min-h-80"
            center={[TEAM_LAT, TEAM_LNG]}
            zoom={15}
            scrollWheelZoom={false}
            markers={[
              {
                lat: TEAM_LAT,
                lng: TEAM_LNG,
                kind: 'market',
                text: 'ML',
                label: 'MarketLink team (placeholder)',
                popup: { title: 'MarketLink team', lines: ['Placeholder pin, District 1'] },
              },
            ]}
          />
          <a
            href={Helper.directionsUrl(TEAM_LAT, TEAM_LNG)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-small text-brand underline"
          >
            Directions to the team
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
