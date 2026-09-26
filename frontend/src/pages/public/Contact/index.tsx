import { useTranslation } from 'react-i18next';
import MarketMap from '@/components/MarketMap';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { directionsUrl } from '@/lib/directions';

const TEAM_LAT = 10.7769;
const TEAM_LNG = 106.7009;

/** FR-083 — how to reach the MarketLink team, separate from a stall's own contact on an order. */
const ContactPage = () => {
  const { t } = useTranslation('Contact');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-155">{t('intro')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h2">{t('team.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('team.email')}</dt>
              <dd className="m-0">{t('team.toAdd')}</dd>
              <dt className="text-ink-muted">{t('team.phone')}</dt>
              <dd className="m-0">{t('team.toAdd')}</dd>
              <dt className="text-ink-muted">{t('team.address')}</dt>
              <dd className="m-0">{t('team.addressValue')}</dd>
              <dt className="text-ink-muted">{t('team.hours')}</dt>
              <dd className="m-0">{t('team.hoursValue')}</dd>
            </dl>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-h3">{t('feedback.title')}</h2>
            <p className="text-[15px]">{t('feedback.text')}</p>
            <ButtonLink to="/feedback" variant="secondary" className="self-start">
              {t('feedback.cta')}
            </ButtonLink>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <MarketMap
            label={t('map.label')}
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
                label: t('map.markerLabel'),
                popup: { title: t('map.popupTitle'), lines: [t('map.popupLine')] },
              },
            ]}
          />
          <a
            href={directionsUrl({ lat: TEAM_LAT, lng: TEAM_LNG })}
            target="_blank"
            rel="noopener noreferrer"
            className="text-small text-brand underline"
          >
            {t('map.directions')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
