import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import LocationPicker from '@/components/LocationPicker';
import { CITY } from '@/config/map';
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
import type { FarmerApplicationInput, FarmerProfileType } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'form' } | { kind: 'applied'; data: FarmerProfileType };

type FormErrors = { stallName?: string; contactPerson?: string };

/** Keys are order statuses only for the icon and colour; the text is `timeline.<key>`. */
const TIMELINE = ['placed', 'accepted', 'ready'] as const;

/** Photo slots in order; the label is `step4.shots.<key>`. */
const SHOTS = ['wide', 'growing', 'other'] as const;
type PhotoSlot = { key: (typeof SHOTS)[number]; url: string | null; uploading: boolean };

/** FR-002 (second route, applying from an existing Customer account — needs its own FR, see the caption below). */
const CustomerBecomeFarmerPage = () => {
  const { t } = useTranslation('CustomerBecomeFarmer');
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
  // Vườn là đất trồng, không phải sạp, nên ghim bắt đầu ở giữa thành phố; chưa kéo thì không gửi toạ độ.
  const [plotPin, setPlotPin] = useState<{ lat: number; lng: number } | null>(null);

  const [photos, setPhotos] = useState<PhotoSlot[]>(SHOTS.map((key) => ({ key, url: null, uploading: false })));
  const [video, setVideo] = useState<{ url: string | null; uploading: boolean }>({ url: null, uploading: false });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photoSlotIndex, setPhotoSlotIndex] = useState(0);

  const [marketId, setMarketId] = useState(markets[0]?.id);

  const [tick1, setTick1] = useState(false);
  const [tick2, setTick2] = useState(false);
  const [tick3, setTick3] = useState(false);
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
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.photo')) });
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
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.video')) });
    }
  };

  const selectedMarket = markets.find((m) => m.id === marketId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: FormErrors = {};
    if (!stallName.trim()) nextErrors.stallName = t('errors.stallName');
    if (!contactPerson.trim()) nextErrors.contactPerson = t('errors.contactPerson');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!tick1 || !tick2 || !tick3) {
      Notification.error({ title: t('toast.missingTitle'), text: t('toast.missing') });
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
      plotLatitude: plotPin?.lat,
      plotLongitude: plotPin?.lng,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      videoUrl: video.url ?? undefined,
      preferredMarketName: selectedMarket?.name,
    };

    setIsSubmitting(true);
    try {
      const response = await FarmerApi.apply(input);
      setStatus({ kind: 'applied', data: response.data });
      window.scrollTo(0, 0);
      Notification.success({ title: t('toast.sentTitle'), text: t('toast.sent') });
    } catch (error) {
      setErrors(Helper.getFieldErrors(error));
      Notification.error({
        text: Helper.getErrorMessage(error, t('errors.send')),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status.kind === 'loading') {
    return (
      <Card aria-busy="true" className="mx-auto flex w-full max-w-180 flex-col gap-3 p-6">
        <span className="sr-only">{t('loading')}</span>
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
          title={t('loadError.title')}
          text={t('loadError.text')}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              {t('loadError.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (status.kind === 'applied') {
    const data = status.data;
    const copy =
      data.approvalStatus === 'pending'
        ? { title: t('sent.title'), text: t('sent.intro') }
        : { title: t(`approval.${data.approvalStatus}.title`), text: t(`approval.${data.approvalStatus}.text`) };
    const photoCount = data.photoUrls?.length ?? 0;
    const evidence = photoCount
      ? t(data.videoUrl ? 'sent.photosAndVideo' : 'sent.photos', { count: photoCount })
      : t(data.videoUrl ? 'sent.noPhotosVideo' : 'sent.noPhotos');
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <p className="text-small text-ink-muted">
          <Link to="/account" className="text-brand underline">
            {t('breadcrumbAccount')}
          </Link>{' '}
          · {t('breadcrumb')}
        </p>

        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{copy.title}</h1>
          <p className="text-body-lg">{copy.text}</p>
        </div>

        {data.approvalStatus === 'suspended' && (
          <Banner variant="warning" title={t('suspendedBanner.title')}>
            {t('suspendedBanner.text')}
          </Banner>
        )}

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">{t('sent.summary')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('sent.stall')}</dt>
            <dd className="m-0">{data.stallName}</dd>
            <dt className="text-ink-muted">{t('step1.person')}</dt>
            <dd className="m-0">{data.contactPerson}</dd>
            {data.description && (
              <>
                <dt className="text-ink-muted">{t('sent.about')}</dt>
                <dd className="m-0">{data.description}</dd>
              </>
            )}
            {!!data.categories?.length && (
              <>
                <dt className="text-ink-muted">{t('sent.grows')}</dt>
                <dd className="m-0">
                  {data.categories.join(', ')}
                  {data.mainCrops && ` · ${data.mainCrops}`}
                </dd>
              </>
            )}
            {data.weeklyVolume && (
              <>
                <dt className="text-ink-muted">{t('sent.volume')}</dt>
                <dd className="m-0">{data.weeklyVolume}</dd>
              </>
            )}
            {(data.plotAddress || data.plotSize || data.growingSinceYear) && (
              <>
                <dt className="text-ink-muted">{t('sent.plot')}</dt>
                <dd className="m-0">
                  {data.plotSize || '—'}
                  {data.plotAddress && ` ${t('sent.plotIn', { place: data.plotAddress })}`}
                  {data.growingSinceYear && `, ${t('sent.plotSince', { year: data.growingSinceYear })}`}
                </dd>
              </>
            )}
            {(!!data.photoUrls?.length || data.videoUrl) && (
              <>
                <dt className="text-ink-muted">{t('sent.evidence')}</dt>
                <dd className="m-0">{evidence}</dd>
              </>
            )}
            {data.preferredMarketName && (
              <>
                <dt className="text-ink-muted">{t('sent.market')}</dt>
                <dd className="m-0">{data.preferredMarketName}</dd>
              </>
            )}
            <dt className="text-ink-muted">{t('sent.status')}</dt>
            <dd className="m-0">{t(`statusValue.${data.approvalStatus}`)}</dd>
            <dt className="text-ink-muted">{t('sent.sentOn')}</dt>
            <dd className="m-0">{formatDate(new Date(data.createdAt))}</dd>
          </dl>
          {!!data.photoUrls?.length && (
            <div className="flex flex-wrap gap-2">
              {data.photoUrls.map((url) => (
                <img
                  key={url}
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`}
                  alt={t('sent.photoAlt')}
                  className="border-line-strong size-20 rounded-sm border-[1.5px] object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/markets" variant="secondary">
              {t('sent.keepShopping')}
            </ButtonLink>
          </div>
        </Card>

        {data.approvalStatus === 'pending' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-h2">{t('sent.progress')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {TIMELINE.map((key, i) => (
                <li key={key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
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
        )}
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
        {user && (
          <p className="font-hand text-hand text-ink-muted">
            {user.createdAt
              ? t('since', { name: user.fullName, date: formatDate(new Date(user.createdAt)) })
              : user.fullName}
          </p>
        )}
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
                  error={errors.stallName}
                  disabled={isSubmitting}
                  className="md:col-span-2"
                />
                <Field
                  id="person"
                  label={t('step1.person')}
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  error={errors.contactPerson}
                  disabled={isSubmitting}
                />
                <Field
                  id="email"
                  label={t('step1.email')}
                  value={user?.email ?? ''}
                  readOnly
                  hint={t('step1.emailHint')}
                />
                <Field
                  id="phone"
                  label={t('step1.phone')}
                  value={user?.phone ?? ''}
                  readOnly
                  hint={t('step1.fromAccount')}
                />
                <Field
                  id="address"
                  label={t('step1.address')}
                  value={user?.address ?? ''}
                  readOnly
                  hint={t('step1.fromAccount')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="about" className="text-small font-bold">
                  {t('step1.about')}
                </label>
                <textarea
                  id="about"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('step1.aboutPlaceholder')}
                  className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
                />
              </div>
            </Card>
          </FormStep>

          <FormStep n={2} title={t('step2.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">{t('step2.categories')}</span>
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
                label={t('step2.crops')}
                value={mainCrops}
                onChange={(e) => setMainCrops(e.target.value)}
                placeholder={t('step2.cropsPlaceholder')}
                hint={t('step2.cropsHint')}
              />
              <Field
                id="volume"
                label={t('step2.volume')}
                value={weeklyVolume}
                onChange={(e) => setWeeklyVolume(e.target.value)}
                placeholder={t('step2.volumePlaceholder')}
                hint={t('step2.volumeHint')}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="method" className="text-small font-bold">
                  {t('step2.method')}
                </label>
                <textarea
                  id="method"
                  value={growingMethod}
                  onChange={(e) => setGrowingMethod(e.target.value)}
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
                  value={plotAddress}
                  onChange={(e) => setPlotAddress(e.target.value)}
                  placeholder={t('step3.plotPlaceholder')}
                  hint={t('step3.plotHint')}
                  className="md:col-span-2"
                />
                <Field
                  id="size"
                  label={t('step3.size')}
                  value={plotSize}
                  onChange={(e) => setPlotSize(e.target.value)}
                  placeholder={t('step3.sizePlaceholder')}
                />
                <Field
                  id="since"
                  label={t('step3.since')}
                  inputMode="numeric"
                  value={growingSinceYear}
                  onChange={(e) => setGrowingSinceYear(e.target.value.replace(/\D/g, ''))}
                  placeholder="2019"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">{t('step3.pin')}</span>
                <LocationPicker
                  label={t('step3.map')}
                  className="min-h-60"
                  lat={plotPin?.lat ?? CITY[0]}
                  lng={plotPin?.lng ?? CITY[1]}
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
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPhotoChosen}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <div key={p.key} className="flex flex-col gap-1.5">
                    {p.url ? (
                      <div className="relative">
                        <img
                          src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${p.url}`}
                          alt={t(`step4.shots.${p.key}`)}
                          className="aspect-4/3 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.map((x, xi) => (xi === i ? { ...x, url: null } : x)))}
                          className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                          aria-label={t('step4.removePhoto', { label: t(`step4.shots.${p.key}`) })}
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
                        {p.uploading ? t('step4.uploading') : t('step4.addPhoto')}
                      </button>
                    )}
                    <small className="text-ink-muted text-[12px]">{t(`step4.shots.${p.key}`)}</small>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vid" className="text-small font-bold">
                  {t('step4.video')}
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
                    <span className="text-small">{t('step4.videoAdded')}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setVideo({ url: null, uploading: false })}
                    >
                      {t('step4.removeVideo')}
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
                    {video.uploading ? t('step4.uploading') : t('step4.addVideo')}
                  </Button>
                )}
                <span className="text-ink-muted text-[13px]">{t('step4.videoHint')}</span>
              </div>
              <Banner title={t('step4.banner.title')}>{t('step4.banner.text')}</Banner>
            </Card>
          </FormStep>

          <FormStep n={5} title={t('step5.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <span className="text-small font-bold">{t('step5.market')}</span>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('step6.sending') : t('step6.send')}
                </Button>
                <ButtonLink to="/account" variant="secondary">
                  {t('step6.later')}
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
