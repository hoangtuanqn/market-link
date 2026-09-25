import { useState, type FormEvent } from 'react';
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
import { dayList } from '@/lib/format';
import Notification from '@/utils/notification';

const SHOTS = [
  ['Wide shot of the plot', 'Required'],
  ['What is growing now', 'Required'],
  ['Anything else', 'Optional'],
] as const;

const TIMELINE: { key: 'placed' | 'accepted' | 'ready'; title: string; note: string; by: string }[] = [
  { key: 'placed', title: 'Application sent', note: 'Just now', by: 'You' },
  { key: 'accepted', title: 'An admin reads it', note: 'Usually within a few market days', by: 'MarketLink' },
  { key: 'ready', title: 'Stall panel opens', note: 'After approval', by: 'MarketLink' },
];

/** FR-002 (second route, applying from an existing Customer account — needs its own FR, see the caption below). */
const CustomerBecomeFarmerPage = () => {
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
  const [t1, setT1] = useState(false);
  const [t2, setT2] = useState(false);
  const [t3, setT3] = useState(false);

  const toggleCat = (name: string) => {
    setSelectedCats((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!t1 || !t2 || !t3) {
      Notification.error({ title: 'Missing boxes', text: 'Tick the three boxes at the end before you send.' });
      return;
    }
    setSent(true);
    window.scrollTo(0, 0);
    Notification.success({ title: 'Application sent', text: 'You will hear from an admin in your notifications.' });
  };

  const selectedMarket = markets.find((m) => m.id === marketId);

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <p className="text-small text-ink-muted">
          <Link to="/account" className="text-brand underline">
            Account
          </Link>{' '}
          · Apply to sell
        </p>

        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">Sent just now</p>
          <h1 className="text-h1">Your application is with an admin</h1>
          <p className="text-body-lg">
            Nothing changes for you in the meantime. Keep shopping, and watch your notifications for the answer.
          </p>
        </div>

        <Banner title="You can still buy from other stalls while this is reviewed.">
          Your orders, favorites and cart are untouched. The stall panel appears only once an admin approves.
        </Banner>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">What you sent</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">Stall</dt>
            <dd className="m-0">{stallName || '—'}</dd>
            <dt className="text-ink-muted">Grows</dt>
            <dd className="m-0">
              {selectedCats.join(', ') || '—'}
              {crops && ` · ${crops}`}
            </dd>
            <dt className="text-ink-muted">Plot</dt>
            <dd className="m-0">
              {plotSize || '—'} in {plot || '—'}, growing since {since || '—'}
            </dd>
            <dt className="text-ink-muted">Evidence</dt>
            <dd className="m-0">
              {photoCount} photo{photoCount === 1 ? '' : 's'}
              {hasVideo ? ' and a video' : ''}
            </dd>
            <dt className="text-ink-muted">Market</dt>
            <dd className="m-0">{selectedMarket?.name}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/markets" variant="secondary">
              Keep shopping
            </ButtonLink>
            <Button
              variant="danger"
              onClick={() => {
                setSent(false);
                Notification.info({ title: 'Application withdrawn', text: 'You can apply again whenever you like.' });
              }}
            >
              Withdraw the application
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-h2">Progress</h2>
          <ol className="m-0 flex flex-col p-0">
            {TIMELINE.map((t, i) => (
              <li key={t.key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="border-line-strong absolute top-[-8px] left-[13px] h-4 border-l-2 border-dotted"
                  />
                )}
                <span
                  className={`grid size-7 flex-none place-items-center rounded-full ${ORDER_STATUS_META[t.key].className} ${i > 0 ? 'opacity-45' : ''}`}
                >
                  {(() => {
                    const Icon = ORDER_STATUS_META[t.key].icon;
                    return <Icon size={14} />;
                  })()}
                </span>
                <div>
                  <b className="text-[15px]">{t.title}</b>
                  <time className="text-ink-muted block text-[13px]">
                    {t.note} · {t.by}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center">
          <Chip pressed onClick={() => setSent(false)}>
            Preview: after sending
          </Chip>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8">
      <p className="text-small text-ink-muted">
        <Link to="/account" className="text-brand underline">
          Account
        </Link>{' '}
        · Apply to sell
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">Nguyễn Minh Khang · customer since 01/08/2026</p>
        <h1 className="text-h1">Sell what you grow</h1>
        <p className="text-body-lg">
          If you grow food, your account can become a stall at one of the four markets. You keep everything you have now
          and carry on shopping from other stalls.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">What happens after you send this</h2>
        <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
          <li>An admin reads the application and looks at your photos, usually within a few market days.</li>
          <li>When it is approved, a stall panel appears in your account for stock, orders and pickup times.</li>
          <li>You set your markets, days and pickup windows there, then list your first products.</li>
        </ol>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <ol className="m-0 flex flex-col gap-8 p-0">
          <FormStep n={1} title="Your stall">
            <Card className="flex flex-col gap-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  id="stall"
                  label="Stall name"
                  required
                  placeholder="e.g. Khang Family Greens"
                  value={stallName}
                  onChange={(e) => setStallName(e.target.value)}
                  hint="Customers see this on the map and on their orders."
                  className="md:col-span-2"
                />
                <Field
                  id="person"
                  label="Contact person"
                  required
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                />
                <Field
                  id="phone"
                  label="Phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  hint="Printed on every order so customers can reach you."
                />
                <Field
                  id="email"
                  label="Email"
                  value="khang@example.com"
                  readOnly
                  hint="Your sign-in stays the same."
                  className="md:col-span-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="about" className="text-small font-bold">
                  About the stall
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="One or two sentences. Who grows it and where."
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
              </div>
            </Card>
          </FormStep>

          <FormStep n={2} title="What you grow">
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  Categories<span className="text-danger ml-0.5">*</span>
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
                label="Main crops"
                required
                value={crops}
                onChange={(e) => setCrops(e.target.value)}
                placeholder="Water spinach, choy sum, Thai basil"
                hint="Separate them with commas. You list real products with prices after approval."
              />
              <Field
                id="volume"
                label="Roughly how much a week"
                required
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="About 120 bunches"
                hint="A rough figure. It helps the admin match you to a market with room."
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="method" className="text-small font-bold">
                  How you grow it
                </label>
                <textarea
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="e.g. No pesticides in the last two seasons."
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
                <span className="text-ink-muted text-[13px]">
                  Optional, and shown on your stall page as your own words. MarketLink does not check or certify any of
                  it.
                </span>
              </div>
            </Card>
          </FormStep>

          <FormStep n={3} title="Where you grow it">
            <Card className="flex flex-col gap-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  id="plot"
                  label="Address of the plot"
                  required
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder="Hamlet, ward, district"
                  hint="Only the admin sees this. Customers see your stall at the market, not your plot."
                  className="md:col-span-2"
                />
                <Field
                  id="size"
                  label="Plot size"
                  required
                  value={plotSize}
                  onChange={(e) => setPlotSize(e.target.value)}
                  placeholder="5,000 m²"
                />
                <Field
                  id="since"
                  label="Growing here since"
                  required
                  inputMode="numeric"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  placeholder="2019"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  Pin the plot<span className="text-danger ml-0.5">*</span>
                </span>
                <LocationPicker
                  label="Pin your plot on the map"
                  className="min-h-60"
                  lat={plotPin.lat}
                  lng={plotPin.lng}
                  pinLabel="Your plot"
                  onMove={(lat, lng) => setPlotPin({ lat, lng })}
                />
                <p className="text-ink-muted text-[13px]">
                  Drag the pin to your plot. It is the quickest way for the admin to see the photos match the place.
                </p>
              </div>
            </Card>
          </FormStep>

          <FormStep n={4} title="Photos of the plot">
            <Card className="flex flex-col gap-4 p-6">
              <p className="text-body">
                Two photos are enough and five is the most. One wide shot that shows the whole plot, and one close shot
                of what is growing right now. Take them in the last 30 days and do not filter them.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {SHOTS.map(([label, req]) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoCount((n) => n + 1);
                        Notification.info({
                          title: 'Add a photo',
                          text: 'Choose a photo from your phone or computer.',
                        });
                      }}
                      className="border-line-strong text-ink aspect-4/3 cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold"
                    >
                      Add photo
                    </button>
                    <small className="text-ink-muted text-[12px]">
                      {label} · {req}
                    </small>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vid" className="text-small font-bold">
                  A short video
                </label>
                <Button
                  variant="secondary"
                  id="vid"
                  type="button"
                  onClick={() => {
                    setHasVideo(true);
                    Notification.info({ title: 'Add a video', text: 'Choose a video, up to 60 seconds.' });
                  }}
                  className="w-fit"
                >
                  Add a video, up to 60 seconds
                </Button>
                <span className="text-ink-muted text-[13px]">
                  Optional. A slow walk along the beds says more than any photo, and it makes approval faster.
                </span>
              </div>
              <Banner title="The admin is checking one thing: that the plot exists and grows what you listed.">
                MarketLink does not check licences, food safety or organic claims, and a photo is not a certificate.
              </Banner>
            </Card>
          </FormStep>

          <FormStep n={5} title="Where you want to sell">
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">
                  Market<span className="text-danger ml-0.5">*</span>
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
              <p className="text-small text-ink-muted">
                Pick one to start with. You set your days, pickup windows and cutoff in the stall panel once you are
                approved, and you can add the other markets later.
              </p>
            </Card>
          </FormStep>

          <FormStep n={6} title="Before you send">
            <Card className="flex flex-col gap-4 p-6">
              <Checkbox id="t1" checked={t1} onChange={(e) => setT1(e.target.checked)}>
                Everything here is true, and the photos are of my own plot
                <small className="text-ink-muted mt-0.5 block text-[13px]">
                  An application with photos that are not yours is rejected and the account can be suspended.
                </small>
              </Checkbox>
              <Checkbox id="t2" checked={t2} onChange={(e) => setT2(e.target.checked)}>
                I will be at the stall in my pickup window
                <small className="text-ink-muted mt-0.5 block text-[13px]">
                  Repeated no-shows are the usual reason a stall is suspended.
                </small>
              </Checkbox>
              <Checkbox id="t3" checked={t3} onChange={(e) => setT3(e.target.checked)}>
                I understand customers pay me at the stall
                <small className="text-ink-muted mt-0.5 block text-[13px]">
                  There is no online payment and no delivery anywhere in MarketLink.
                </small>
              </Checkbox>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Send the application</Button>
                <ButtonLink to="/account" variant="secondary">
                  Save and finish later
                </ButtonLink>
              </div>
            </Card>
          </FormStep>
        </ol>
      </form>

      <p className="text-center">
        <Chip pressed={false} onClick={() => setSent(true)}>
          Preview: after sending
        </Chip>
      </p>
    </div>
  );
};

export default CustomerBecomeFarmerPage;
