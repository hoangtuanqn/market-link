import { Trans, useTranslation } from 'react-i18next';
import Carousel, { type CarouselSlide } from '@/components/Carousel';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dayName, formatClock } from '@/lib/format';

const UNSPLASH = 'https://images.unsplash.com/';
const SHOT = '?w=1800&q=72&auto=format&fit=crop';

/** Keys under `slides.` in About.json; the text is looked up when rendering. */
const SLIDES = [
  { key: 'mission', photo: `${UNSPLASH}photo-1533900298318-6b8da08a523e${SHOT}`, to: '/markets' },
  { key: 'howItWorks', photo: `${UNSPLASH}photo-1464226184884-fa280b87c399${SHOT}`, to: '/products' },
  { key: 'technology', photo: `${UNSPLASH}photo-1416879595882-3373a0480b5b${SHOT}`, to: '/map' },
  { key: 'benefit', photo: `${UNSPLASH}photo-1574943320219-553eb213f72d${SHOT}`, to: '/register/farmer' },
] as const;

/** Keys under `limits.` in About.json. */
const LIMITS = ['payment', 'delivery', 'certification', 'profiles'] as const;

/**
 * Keys under `team.` in About.json. Repository roles: lead = LEAD, be1 = BE1, be2 = BE2, fe1 = FE1, fe2 = FE2, qa = QA
 * / DOC. The role codes are for the team, not shown on screen.
 */
const TEAM = ['lead', 'be1', 'be2', 'fe1', 'fe2', 'qa'] as const;

/** FR-082 — what MarketLink is, what it deliberately does not do, and who built it. */
const AboutPage = () => {
  const { t, i18n } = useTranslation('About');
  const num = (n: number) => new Intl.NumberFormat(i18n.language).format(n);

  const notes: Record<(typeof SLIDES)[number]['key'], string> = {
    mission: `Thảo Điền · ${formatClock('06:40')}`,
    howItWorks: `Thủ Đức · ${dayName(6)} ${formatClock('06:00')}`,
    technology: t('slides.technology.note', { count: 12, n: num(12) }),
    benefit: t('slides.benefit.note', { place: 'Củ Chi', day: dayName(5) }),
  };
  const slides: CarouselSlide[] = SLIDES.map((s) => ({
    topic: t(`slides.${s.key}.topic`),
    title: t(`slides.${s.key}.title`),
    text: t(`slides.${s.key}.text`),
    photo: s.photo,
    alt: t(`slides.${s.key}.alt`),
    note: notes[s.key],
    cta: [t(`slides.${s.key}.cta`), s.to],
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">TechWiz 7 · eGreen Basket</p>
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg max-w-160">{t('intro')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Carousel slides={slides} label={t('carouselLabel')} />
        <p className="text-caption text-ink-muted">{t('photosNote')}</p>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-h2">{t('why.title')}</h2>
          <p className="text-body max-w-155">{t('why.shoppers')}</p>
          <p className="text-body max-w-155">{t('why.farmers')}</p>
        </div>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('limits.title')}</h2>
          <ul className="m-0 flex flex-col gap-2.5 p-0 text-[15px]">
            {LIMITS.map((key) => (
              <li key={key} className="list-none">
                <Trans t={t} i18nKey={`limits.${key}`} components={{ b: <b /> }} />
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">{t('team.title')}</h2>
          <span className="text-small text-ink-muted">{t('team.subtitle')}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((key) => (
            <Card key={key} className="flex flex-col gap-1 p-4">
              <p className="text-overline text-ink-muted m-0">{t(`team.${key}.role`)}</p>
              <b className="text-[16px]">{t('team.namePending')}</b>
              <span className="text-[14px]">{t(`team.${key}.note`)}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('stack.title')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('stack.frontend')}</dt>
            <dd className="m-0">React 19, Vite, TypeScript, Tailwind 4</dd>
            <dt className="text-ink-muted">{t('stack.backend')}</dt>
            <dd className="m-0">Spring Boot, Java 25, MySQL 8, Redis, Flyway</dd>
            <dt className="text-ink-muted">{t('stack.maps')}</dt>
            {/* Leaflet + OSM rather than Google Maps: no API key that can expire during the demo (D-12). */}
            <dd className="m-0">{t('stack.mapsValue')}</dd>
            <dt className="text-ink-muted">{t('stack.design')}</dt>
            <dd className="m-0">{t('stack.designValue')}</dd>
          </dl>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">{t('credits.title')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('credits.mapData')}</dt>
            <dd className="m-0">{t('credits.mapDataValue')}</dd>
            <dt className="text-ink-muted">{t('credits.photos')}</dt>
            <dd className="m-0">{t('credits.photosValue')}</dd>
            <dt className="text-ink-muted">{t('credits.locale')}</dt>
            <dd className="m-0">{t('credits.localeValue', { format: 'dd/MM/yyyy', zone: 'Asia/Ho_Chi_Minh' })}</dd>
          </dl>
        </Card>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">{t('contact.title')}</h2>
          <p className="text-small text-ink-muted">{t('contact.text')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/contact" variant="secondary">
            {t('contact.contactUs')}
          </ButtonLink>
          <ButtonLink to="/feedback" variant="secondary">
            {t('contact.feedback')}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;
