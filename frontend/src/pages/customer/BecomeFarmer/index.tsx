import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import MapPlaceholder from '@/components/MapPlaceholder';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState } from '@/components/ui/data-state';
import { Field } from '@/components/ui/input';
import { FormStep } from '@/components/ui/form-step';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { categories } from '@/data/customer';
import { markets } from '@/data/home';
import useSession from '@/hooks/useSession';
import { dayList, formatDate } from '@/lib/format';
import type { FarmerApplicationInput, FarmerApproval, FarmerProfileType } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'form' } | { kind: 'applied'; data: FarmerProfileType };

type FormErrors = { stallName?: string; contactPerson?: string };

const APPROVAL_COPY: Record<FarmerApproval, { title: string; text: string }> = {
  pending: {
    title: 'Your application is with an admin',
    text: 'Nothing changes for you in the meantime. Keep shopping, and watch your notifications for the answer.',
  },
  approved: {
    title: 'Your stall is approved',
    text: 'Your account can now set up a stall — markets, pickup windows and products — from the farmer panel.',
  },
  rejected: {
    title: 'Your application was not approved',
    text: 'Contact an admin from the feedback form if you think this is a mistake.',
  },
  suspended: {
    title: 'Your stall is suspended',
    text: 'You can still sign in, but your products stay hidden from customers until an admin lifts the suspension.',
  },
};

const TIMELINE: { key: 'placed' | 'accepted' | 'ready'; title: string; note: string; by: string }[] = [
  { key: 'placed', title: 'Application sent', note: 'Just now', by: 'You' },
  { key: 'accepted', title: 'An admin reads it', note: 'Usually within a few market days', by: 'MarketLink' },
  { key: 'ready', title: 'Stall panel opens', note: 'After approval', by: 'MarketLink' },
];

type PhotoSlot = { label: string; hint: string; url: string | null; uploading: boolean };
const INITIAL_SHOTS: [string, string][] = [
  ['Wide shot of the plot', 'A view of the whole plot'],
  ['What is growing now', 'A close shot of the current crop'],
  ['Anything else', 'Optional'],
];

/** FR-002 (second route, applying from an existing Customer account — needs its own FR, see the caption below). */
const CustomerBecomeFarmerPage = () => {
  const { user } = useSession();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  const [stallName, setStallName] = useState('');
  const [contactPerson, setContactPerson] = useState(user?.fullName ?? '');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mainCrops, setMainCrops] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState('');
  const [growingMethod, setGrowingMethod] = useState('');

  const [plotAddress, setPlotAddress] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [growingSinceYear, setGrowingSinceYear] = useState('');
  const [plotLatitude, setPlotLatitude] = useState('');
  const [plotLongitude, setPlotLongitude] = useState('');

  const [photos, setPhotos] = useState<PhotoSlot[]>(
    INITIAL_SHOTS.map(([label, hint]) => ({ label, hint, url: null, uploading: false })),
  );
  const [video, setVideo] = useState<{ url: string | null; uploading: boolean }>({ url: null, uploading: false });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photoSlotIndex, setPhotoSlotIndex] = useState(0);

  const [marketId, setMarketId] = useState(markets[0]?.id);

  const [t1, setT1] = useState(false);
  const [t2, setT2] = useState(false);
  const [t3, setT3] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchStatus = useCallback(() => {
    FarmerApi.myApplication()
      .then((response) => setStatus(response.data ? { kind: 'applied', data: response.data } : { kind: 'form' }))
      .catch(() => setStatus({ kind: 'error' }));
  }, []);

  useEffect(fetchStatus, [fetchStatus]);

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchStatus();
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const pickPhoto = (index: number) => {
    setPhotoSlotIndex(index);
    photoInputRef.current?.click();
  };

  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const index = photoSlotIndex;
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: true } : p)));
    try {
      const response = await FarmerApi.uploadFile(file, 'photo');
      setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, url: response.data.url, uploading: false } : p)));
    } catch (error) {
      setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not upload that photo. Please try again.') });
    }
  };

  const onVideoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setVideo({ url: null, uploading: true });
    try {
      const response = await FarmerApi.uploadFile(file, 'video');
      setVideo({ url: response.data.url, uploading: false });
    } catch (error) {
      setVideo({ url: null, uploading: false });
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not upload that video. Please try again.') });
    }
  };

  const selectedMarket = markets.find((m) => m.id === marketId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: FormErrors = {};
    if (!stallName.trim()) nextErrors.stallName = 'Enter your stall name.';
    if (!contactPerson.trim()) nextErrors.contactPerson = 'Enter a contact person.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!t1 || !t2 || !t3) {
      Notification.error({ title: 'Missing boxes', text: 'Tick the three boxes at the end before you send.' });
      return;
    }

    const photoUrls = photos.map((p) => p.url).filter((url): url is string => url !== null);
    const input: FarmerApplicationInput = {
      stallName: stallName.trim(),
      contactPerson: contactPerson.trim(),
      description: description.trim() || undefined,
      categories: selectedCategories.length ? selectedCategories : undefined,
      mainCrops: mainCrops.trim() || undefined,
      weeklyVolume: weeklyVolume.trim() || undefined,
      growingMethod: growingMethod.trim() || undefined,
      plotAddress: plotAddress.trim() || undefined,
      plotSize: plotSize.trim() || undefined,
      growingSinceYear: growingSinceYear ? Number(growingSinceYear) : undefined,
      plotLatitude: plotLatitude ? Number(plotLatitude) : undefined,
      plotLongitude: plotLongitude ? Number(plotLongitude) : undefined,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      videoUrl: video.url ?? undefined,
      preferredMarketName: selectedMarket?.name,
    };

    setIsSubmitting(true);
    try {
      const response = await FarmerApi.apply(input);
      setStatus({ kind: 'applied', data: response.data });
      window.scrollTo(0, 0);
      Notification.success({ title: 'Application sent', text: 'You will hear from an admin in your notifications.' });
    } catch (error) {
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, 'Could not send your application. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status.kind === 'loading') {
    return (
      <Card aria-busy="true" className="mx-auto flex w-full max-w-180 flex-col gap-3 p-6">
        <span className="sr-only">Loading your application status</span>
        <div className="bg-surface-sunken h-6 w-72 max-w-full rounded-sm" />
        <div className="bg-surface-sunken h-4 w-full rounded-sm" />
        <div className="bg-surface-sunken h-32 w-full rounded-sm" />
      </Card>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="mx-auto w-full max-w-180">
        <DataState
          variant="error"
          title="Couldn't load your application status"
          text="Check your connection and try again."
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (status.kind === 'applied') {
    const data = status.data;
    const copy = APPROVAL_COPY[data.approvalStatus];
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <p className="text-small text-ink-muted">
          <Link to="/account" className="text-brand underline">
            Account
          </Link>{' '}
          · Apply to sell
        </p>

        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{copy.title}</h1>
          <p className="text-body-lg">{copy.text}</p>
        </div>

        {data.approvalStatus === 'suspended' && (
          <Banner variant="warning" title="Selling is paused on this account.">
            Existing orders already placed still run their course; you just cannot take new ones for now.
          </Banner>
        )}

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">What you sent</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">Stall</dt>
            <dd className="m-0">{data.stallName}</dd>
            <dt className="text-ink-muted">Contact person</dt>
            <dd className="m-0">{data.contactPerson}</dd>
            {data.description && (
              <>
                <dt className="text-ink-muted">About</dt>
                <dd className="m-0">{data.description}</dd>
              </>
            )}
            {!!data.categories?.length && (
              <>
                <dt className="text-ink-muted">Grows</dt>
                <dd className="m-0">
                  {data.categories.join(', ')}
                  {data.mainCrops && ` · ${data.mainCrops}`}
                </dd>
              </>
            )}
            {data.weeklyVolume && (
              <>
                <dt className="text-ink-muted">Roughly a week</dt>
                <dd className="m-0">{data.weeklyVolume}</dd>
              </>
            )}
            {(data.plotAddress || data.plotSize || data.growingSinceYear) && (
              <>
                <dt className="text-ink-muted">Plot</dt>
                <dd className="m-0">
                  {data.plotSize || '—'}
                  {data.plotAddress && ` in ${data.plotAddress}`}
                  {data.growingSinceYear && `, growing since ${data.growingSinceYear}`}
                </dd>
              </>
            )}
            {(!!data.photoUrls?.length || data.videoUrl) && (
              <>
                <dt className="text-ink-muted">Evidence</dt>
                <dd className="m-0">
                  {data.photoUrls?.length
                    ? `${data.photoUrls.length} photo${data.photoUrls.length === 1 ? '' : 's'}`
                    : 'No photos'}
                  {data.videoUrl && ' and a video'}
                </dd>
              </>
            )}
            {data.preferredMarketName && (
              <>
                <dt className="text-ink-muted">Market</dt>
                <dd className="m-0">{data.preferredMarketName}</dd>
              </>
            )}
            <dt className="text-ink-muted">Status</dt>
            <dd className="m-0 capitalize">{data.approvalStatus}</dd>
            <dt className="text-ink-muted">Sent</dt>
            <dd className="m-0">{formatDate(new Date(data.createdAt))}</dd>
          </dl>
          {!!data.photoUrls?.length && (
            <div className="flex flex-wrap gap-2">
              {data.photoUrls.map((url) => (
                <img
                  key={url}
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`}
                  alt="Plot"
                  className="border-line-strong size-20 rounded-sm border-[1.5px] object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/markets" variant="secondary">
              Keep shopping
            </ButtonLink>
          </div>
        </Card>

        {data.approvalStatus === 'pending' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-h2">Progress</h2>
            <ol className="m-0 flex flex-col p-0">
              {TIMELINE.map((t, i) => (
                <li key={t.key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
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
        )}
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
        {user && (
          <p className="font-hand text-hand text-ink-muted">
            {user.fullName}
            {user.createdAt && ` · customer since ${formatDate(new Date(user.createdAt))}`}
          </p>
        )}
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
                  error={errors.stallName}
                  disabled={isSubmitting}
                  className="md:col-span-2"
                />
                <Field
                  id="person"
                  label="Contact person"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  error={errors.contactPerson}
                  disabled={isSubmitting}
                />
                <Field
                  id="email"
                  label="Email"
                  value={user?.email ?? ''}
                  readOnly
                  hint="Your sign-in stays the same."
                />
                <Field
                  id="phone"
                  label="Phone"
                  value={user?.phone ?? ''}
                  readOnly
                  hint="From your account. Change it on the Account page first if it's wrong."
                />
                <Field
                  id="address"
                  label="Address"
                  value={user?.address ?? ''}
                  readOnly
                  hint="From your account. Change it on the Account page first if it's wrong."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="about" className="text-small font-bold">
                  About the stall
                </label>
                <textarea
                  id="about"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One or two sentences. Who grows it and where."
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
              </div>
            </Card>
          </FormStep>

          <FormStep n={2} title="What you grow">
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">Categories</span>
                <div className="flex flex-col gap-2">
                  {categories.map((c) => (
                    <Checkbox
                      key={c}
                      id={`cat-${c}`}
                      checked={selectedCategories.includes(c)}
                      onChange={() => toggleCategory(c)}
                    >
                      {c}
                    </Checkbox>
                  ))}
                </div>
              </div>
              <Field
                id="crops"
                label="Main crops"
                value={mainCrops}
                onChange={(e) => setMainCrops(e.target.value)}
                placeholder="Water spinach, choy sum, Thai basil"
                hint="Separate them with commas. You list real products with prices after approval."
              />
              <Field
                id="volume"
                label="Roughly how much a week"
                value={weeklyVolume}
                onChange={(e) => setWeeklyVolume(e.target.value)}
                placeholder="About 120 bunches"
                hint="A rough figure. It helps the admin match you to a market with room."
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="method" className="text-small font-bold">
                  How you grow it
                </label>
                <textarea
                  id="method"
                  value={growingMethod}
                  onChange={(e) => setGrowingMethod(e.target.value)}
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
                  value={plotAddress}
                  onChange={(e) => setPlotAddress(e.target.value)}
                  placeholder="Hamlet, ward, district"
                  hint="Only the admin sees this. Customers see your stall at the market, not your plot."
                  className="md:col-span-2"
                />
                <Field
                  id="size"
                  label="Plot size"
                  value={plotSize}
                  onChange={(e) => setPlotSize(e.target.value)}
                  placeholder="5,000 m²"
                />
                <Field
                  id="since"
                  label="Growing here since"
                  inputMode="numeric"
                  value={growingSinceYear}
                  onChange={(e) => setGrowingSinceYear(e.target.value.replace(/\D/g, ''))}
                  placeholder="2019"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">Pin the plot</span>
                <MapPlaceholder label="Pin your plot on the map" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    id="lat"
                    label="Latitude"
                    value={plotLatitude}
                    onChange={(e) => setPlotLatitude(e.target.value)}
                    placeholder="10.8721"
                  />
                  <Field
                    id="lng"
                    label="Longitude"
                    value={plotLongitude}
                    onChange={(e) => setPlotLongitude(e.target.value)}
                    placeholder="106.5931"
                  />
                </div>
                <p className="text-ink-muted text-[13px]">
                  The real map pin lands with the map screen — for now, type the coordinates by hand if you know them.
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
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPhotoChosen}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <div key={p.label} className="flex flex-col gap-1.5">
                    {p.url ? (
                      <div className="relative">
                        <img
                          src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${p.url}`}
                          alt={p.label}
                          className="aspect-4/3 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.map((x, xi) => (xi === i ? { ...x, url: null } : x)))}
                          className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                          aria-label={`Remove ${p.label}`}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pickPhoto(i)}
                        disabled={p.uploading}
                        className="border-line-strong text-ink aspect-4/3 cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold disabled:opacity-50"
                      >
                        {p.uploading ? 'Uploading…' : 'Add photo'}
                      </button>
                    )}
                    <small className="text-ink-muted text-[12px]">{p.label}</small>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vid" className="text-small font-bold">
                  A short video
                </label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={onVideoChosen}
                />
                {video.url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-small">Video added</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setVideo({ url: null, uploading: false })}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    id="vid"
                    type="button"
                    disabled={video.uploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="w-fit"
                  >
                    {video.uploading ? 'Uploading…' : 'Add a video, up to 60 seconds'}
                  </Button>
                )}
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
                <span className="text-small font-bold">Market</span>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send the application'}
                </Button>
                <ButtonLink to="/account" variant="secondary">
                  Save and finish later
                </ButtonLink>
              </div>
            </Card>
          </FormStep>
        </ol>
      </form>
    </div>
  );
};

export default CustomerBecomeFarmerPage;
