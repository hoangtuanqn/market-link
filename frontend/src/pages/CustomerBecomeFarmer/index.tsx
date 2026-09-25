import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LocationPicker from '@/components/LocationPicker';
import { CITY } from '@/config/map';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/input';
import { FormStep } from '@/components/ui/form-step';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { categories } from '@/data/customer';
import { markets } from '@/data/home';
import { dayList, formatDate } from '@/lib/format';
import Notification from '@/utils/notification';

const SHOTS = [
  ['wide', 'required'],
  ['growing', 'required'],
  ['other', 'optional'],
] as const;

/** Keys are order statuses only for the icon and colour; the text is `timeline.<key>`. */
const TIMELINE = ['placed', 'accepted', 'ready'] as const;

/** FR-002 (second route, applying from an existing Customer account — needs its own FR, see the caption below). */
const CustomerBecomeFarmerPage = () => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  const [sent, setSent] = useState(false);
  const [stallName, setStallName] = useState('');
  const [person, setPerson] = useState('Nguyễn Minh Khang');
  const [phone, setPhone] = useState('0903 118 218');
  const [about, setAbout] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([categories[0]]);
  const [crops, setCrops] = useState('');
  const [volume, setVolume] = useState('');
  const [method, setMethod] = useState('');
  const [plot, setPlot] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [since, setSince] = useState('');
  const [photoCount, setPhotoCount] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [marketId, setMarketId] = useState(4);
  // The plot is farmland, not the stall, so it starts on the city rather than on any market.
  const [plotPin, setPlotPin] = useState({ lat: CITY[0], lng: CITY[1] });
  const [tick1, setTick1] = useState(false);
  const [tick2, setTick2] = useState(false);
  const [tick3, setTick3] = useState(false);

  const toggleCat = (name: string) => {
    setSelectedCats((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tick1 || !tick2 || !tick3) {
      Notification.error({ title: t('toast.missingTitle'), text: t('toast.missing') });
      return;
    }
    setSent(true);
    window.scrollTo(0, 0);
    Notification.success({ title: t('toast.sentTitle'), text: t('toast.sent') });
  };

  const selectedMarket = markets.find((m) => m.id === marketId);

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <p className="text-small text-ink-muted">
          <Link to="/account" className="text-brand underline">
            {t('breadcrumbAccount')}
          </Link>{' '}
          · {t('breadcrumb')}
        </p>

        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">{t('sent.eyebrow')}</p>
          <h1 className="text-h1">{t('sent.title')}</h1>
          <p className="text-body-lg">{t('sent.intro')}</p>
        </div>

        <Banner title={t('sent.banner.title')}>{t('sent.banner.text')}</Banner>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">{t('sent.summary')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('sent.stall')}</dt>
            <dd className="m-0">{stallName || '—'}</dd>
            <dt className="text-ink-muted">{t('sent.grows')}</dt>
            <dd className="m-0">
              {selectedCats.join(', ') || '—'}
              {crops && ` · ${crops}`}
            </dd>
            <dt className="text-ink-muted">{t('sent.plot')}</dt>
            <dd className="m-0">
              {t('sent.plotText', { size: plotSize || '—', place: plot || '—', since: since || '—' })}
            </dd>
            <dt className="text-ink-muted">{t('sent.evidence')}</dt>
            <dd className="m-0">
              {hasVideo ? t('sent.photosAndVideo', { count: photoCount }) : t('sent.photos', { count: photoCount })}
            </dd>
            <dt className="text-ink-muted">{t('sent.market')}</dt>
            <dd className="m-0">{selectedMarket?.name}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/markets" variant="secondary">
              {t('sent.keepShopping')}
            </ButtonLink>
            <Button
              variant="danger"
              onClick={() => {
                setSent(false);
                Notification.info({ title: t('toast.withdrawnTitle'), text: t('toast.withdrawn') });
              }}
            >
              {t('sent.withdraw')}
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-h2">{t('sent.progress')}</h2>
          <ol className="m-0 flex flex-col p-0">
            {TIMELINE.map((key, i) => (
              <li key={key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="border-line-strong absolute top-[-8px] left-[13px] h-4 border-l-2 border-dotted"
                  />
                )}
                <span
                  className={`grid size-7 flex-none place-items-center rounded-full ${ORDER_STATUS_META[key].className} ${i > 0 ? 'opacity-45' : ''}`}
                >
                  {(() => {
                    const Icon = ORDER_STATUS_META[key].icon;
                    return <Icon size={14} />;
                  })()}
                </span>
                <div>
                  <b className="text-[15px]">{t(`timeline.${key}.title`)}</b>
                  <time className="text-ink-muted block text-[13px]">
                    {t(`timeline.${key}.note`)} · {t(`timeline.${key}.by`)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center">
          <Chip pressed onClick={() => setSent(false)}>
            {t('preview')}
          </Chip>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8">
      <p className="text-small text-ink-muted">
        <Link to="/account" className="text-brand underline">
          {t('breadcrumbAccount')}
        </Link>{' '}
        · {t('breadcrumb')}
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">
          {t('since', { name: 'Nguyễn Minh Khang', date: formatDate(new Date(2026, 7, 1)) })}
        </p>
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('next.title')}</h2>
        <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
          <li>{t('next.read')}</li>
          <li>{t('next.panel')}</li>
          <li>{t('next.setup')}</li>
        </ol>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <ol className="m-0 flex flex-col gap-8 p-0">
          <FormStep n={1} title={t('step1.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  id="stall"
                  label={t('step1.stallName')}
                  required
                  placeholder={t('step1.stallNamePlaceholder')}
                  value={stallName}
                  onChange={(e) => setStallName(e.target.value)}
                  hint={t('step1.stallNameHint')}
                  className="md:col-span-2"
                />
                <Field
                  id="person"
                  label={t('step1.person')}
                  required
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                />
                <Field
                  id="phone"
                  label={t('step1.phone')}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  hint={t('step1.phoneHint')}
                />
                <Field
                  id="email"
                  label={t('step1.email')}
                  value="khang@example.com"
                  readOnly
                  hint={t('step1.emailHint')}
                  className="md:col-span-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="about" className="text-small font-bold">
                  {t('step1.about')}
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder={t('step1.aboutPlaceholder')}
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
              </div>
            </Card>
          </FormStep>

          <FormStep n={2} title={t('step2.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  {t('step2.categories')}
                  <span className="text-danger ml-0.5">*</span>
                </span>
                <div className="flex flex-col gap-2">
                  {categories.map((c) => (
                    <Checkbox key={c} id={`cat-${c}`} checked={selectedCats.includes(c)} onChange={() => toggleCat(c)}>
                      {c}
                    </Checkbox>
                  ))}
                </div>
              </div>
              <Field
                id="crops"
                label={t('step2.crops')}
                required
                value={crops}
                onChange={(e) => setCrops(e.target.value)}
                placeholder={t('step2.cropsPlaceholder')}
                hint={t('step2.cropsHint')}
              />
              <Field
                id="volume"
                label={t('step2.volume')}
                required
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder={t('step2.volumePlaceholder')}
                hint={t('step2.volumeHint')}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="method" className="text-small font-bold">
                  {t('step2.method')}
                </label>
                <textarea
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder={t('step2.methodPlaceholder')}
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
                <span className="text-ink-muted text-[13px]">{t('step2.methodHint')}</span>
              </div>
            </Card>
          </FormStep>

          <FormStep n={3} title={t('step3.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  id="plot"
                  label={t('step3.plot')}
                  required
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder={t('step3.plotPlaceholder')}
                  hint={t('step3.plotHint')}
                  className="md:col-span-2"
                />
                <Field
                  id="size"
                  label={t('step3.size')}
                  required
                  value={plotSize}
                  onChange={(e) => setPlotSize(e.target.value)}
                  placeholder={t('step3.sizePlaceholder')}
                />
                <Field
                  id="since"
                  label={t('step3.since')}
                  required
                  inputMode="numeric"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  placeholder="2019"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  {t('step3.pin')}
                  <span className="text-danger ml-0.5">*</span>
                </span>
                <LocationPicker
                  label={t('step3.map')}
                  className="min-h-60"
                  lat={plotPin.lat}
                  lng={plotPin.lng}
                  pinLabel={t('step3.yourPlot')}
                  onMove={(lat, lng) => setPlotPin({ lat, lng })}
                />
                <p className="text-ink-muted text-[13px]">{t('step3.pinHint')}</p>
              </div>
            </Card>
          </FormStep>

          <FormStep n={4} title={t('step4.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <p className="text-body">{t('step4.intro')}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {SHOTS.map(([label, req]) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoCount((n) => n + 1);
                        Notification.info({
                          title: t('toast.photoTitle'),
                          text: t('toast.photo'),
                        });
                      }}
                      className="border-line-strong text-ink aspect-4/3 cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold"
                    >
                      {t('step4.addPhoto')}
                    </button>
                    <small className="text-ink-muted text-[12px]">
                      {t(`step4.shots.${label}`)} · {t(`step4.${req}`)}
                    </small>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vid" className="text-small font-bold">
                  {t('step4.video')}
                </label>
                <Button
                  variant="secondary"
                  id="vid"
                  type="button"
                  onClick={() => {
                    setHasVideo(true);
                    Notification.info({ title: t('toast.videoTitle'), text: t('toast.video') });
                  }}
                  className="w-fit"
                >
                  {t('step4.addVideo')}
                </Button>
                <span className="text-ink-muted text-[13px]">{t('step4.videoHint')}</span>
              </div>
              <Banner title={t('step4.banner.title')}>{t('step4.banner.text')}</Banner>
            </Card>
          </FormStep>

          <FormStep n={5} title={t('step5.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  {t('step5.market')}
                  <span className="text-danger ml-0.5">*</span>
                </span>
                <div className="flex flex-col gap-2">
                  {markets.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-[15px]">
                      <input
                        type="radio"
                        name="mk"
                        checked={marketId === m.id}
                        onChange={() => setMarketId(m.id)}
                        className="accent-brand size-4.5"
                      />
                      {m.name} <span className="text-ink-muted">· {dayList(m.days)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-small text-ink-muted">{t('step5.hint')}</p>
            </Card>
          </FormStep>

          <FormStep n={6} title={t('step6.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <Checkbox id="t1" checked={tick1} onChange={(e) => setTick1(e.target.checked)}>
                {t('step6.true')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step6.trueHint')}</small>
              </Checkbox>
              <Checkbox id="t2" checked={tick2} onChange={(e) => setTick2(e.target.checked)}>
                {t('step6.present')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step6.presentHint')}</small>
              </Checkbox>
              <Checkbox id="t3" checked={tick3} onChange={(e) => setTick3(e.target.checked)}>
                {t('step6.pay')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step6.payHint')}</small>
              </Checkbox>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t('step6.send')}</Button>
                <ButtonLink to="/account" variant="secondary">
                  {t('step6.later')}
                </ButtonLink>
              </div>
            </Card>
          </FormStep>
        </ol>
      </form>

      <p className="text-center">
        <Chip pressed={false} onClick={() => setSent(true)}>
          {t('preview')}
        </Chip>
      </p>
    </div>
  );
};

export default CustomerBecomeFarmerPage;
