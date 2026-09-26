import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import CatalogApi, {
  parseIsoDate,
  toClosure,
  type MarketClosureDto,
  type MarketInput,
} from '@/api-requests/catalog.requests';
import { CheckIcon } from '@/components/icons';
import LocationPicker from '@/components/LocationPicker';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { HCMC_DISTRICTS } from '@/config/districts';
import { SHOW_WIP } from '@/config/wip';
import { ADMIN_MARKETS_PATH } from '@/constants/nav';
import { CLOSURE_HANDLINGS, marketAdmin, type ClosureHandling, type ClosureType } from '@/data/admin';
import useRequest from '@/hooks/useRequest';
import { isLatitude, isLongitude, parseCoordinate, parseCoordinatePair } from '@/lib/coordinates';
import { dayName, formatDate } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Monday-first, which is how the operating days read on the market page. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** Lets the Save button sit at the end of the page instead of inside the form's own grid column. */
const FORM_ID = 'market-form';

/** Matches MarketRequest.images's @Size(max=8) on the server. */
const MAX_IMAGES = 8;

const DISTRICTS = HCMC_DISTRICTS.map((d) => d.name);

type FormState = {
  name: string;
  address: string;
  district: string;
  days: number[];
  open: string;
  close: string;
  lat: number;
  lng: number;
  notes: string;
  /** URLs already uploaded via POST /admin/markets/images; the first one becomes the cover photo. */
  images: string[];
};

/** Keys are the form's own; the server's camelCase field names are translated onto them in `fieldErrors`. */
type FormErrors = Partial<Record<'name' | 'address' | 'days' | 'open' | 'close' | 'lat' | 'lng' | 'images', string>>;

/** A closed day plus the raw ISO date `toClosure` drops, so a newly added one can be synced on submit. */
type FormClosure = ClosureType & { closedOn: string };

/** A blank market, for the add form. */
const EMPTY: FormState = {
  name: '',
  address: '',
  district: DISTRICTS[0],
  days: [6],
  open: '06:00',
  close: '10:00',
  lat: 10.7769,
  lng: 106.7009,
  notes: '',
  images: [],
};

/** Today's calendar date in Ho Chi Minh City as "yyyy-MM-dd" (en-CA formats that way), whatever the browser's zone. */
const todayInHcmc = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

const EMPTY_DRAFT = { date: '', reason: '', handling: 'move' as ClosureHandling };

/** Contract §3 field names → the form's keys, so a server-side validation message lands under the right input. */
const SERVER_FIELDS: Record<string, keyof FormErrors> = {
  marketName: 'name',
  address: 'address',
  operatingDays: 'days',
  openingTime: 'open',
  closingTime: 'close',
  latitude: 'lat',
  longitude: 'lng',
  images: 'images',
};

const fromMarket = (m: MarketType, notes: string): FormState => ({
  name: m.name,
  address: m.address,
  district: m.district,
  days: m.days,
  open: m.open,
  close: m.close,
  lat: m.lat,
  lng: m.lng,
  notes,
  images: m.images ?? [],
});

/**
 * FR-073 — add or edit one market: name, address, operating days, hours and the pin customers navigate to. The closed
 * days panel underneath is where a one-off closure lives, so it has somewhere to sit instead of only being announced.
 */
const AdminMarketFormPage = () => {
  const { t } = useTranslation('AdminMarketForm');
  const { t: tc } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || id === undefined;

  const marketId = Number(id);
  const validId = isNew || (Number.isInteger(marketId) && marketId > 0);
  const { state: load, retry } = useRequest(`admin-market:${id ?? 'new'}`, () =>
    isNew
      ? Promise.resolve<MarketType | null>(null)
      : validId
        ? CatalogApi.getMarket(marketId).then((result) => result.market)
        : Promise.reject(new Error('missing')),
  );
  /** The server's 404, or an id that could never be one — the "not here any more" page, not the error block. */
  const missing = load.kind === 'error' && (!validId || Helper.getErrorCode(load.error) === 'MARKET_NOT_FOUND');
  const existing = load.kind === 'ready' ? load.data : null;

  // The form mirrors the loaded market until something is typed, then it is its own state (no effect needed).
  const loadedForm = existing ? fromMarket(existing, SHOW_WIP ? (marketAdmin[existing.id]?.notes ?? '') : '') : EMPTY;
  const [edited, setEdited] = useState<FormState | null>(null);
  const form = edited ?? loadedForm;
  const setForm = (next: FormState | ((current: FormState) => FormState)) =>
    setEdited((current) => (typeof next === 'function' ? next(current ?? loadedForm) : next));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  // Closed days: fetched independently of the market load, same isNew/validId guard as it. Never persisted until
  // the whole form is submitted (see the diff-and-sync in onSubmit), same mirror-until-edited pattern as the rest.
  const { state: closuresLoad } = useRequest(`admin-market-closures:${id ?? 'new'}`, () =>
    isNew || !validId ? Promise.resolve<MarketClosureDto[]>([]) : CatalogApi.listClosures(marketId),
  );
  const loadedClosures: FormClosure[] =
    closuresLoad.kind === 'ready'
      ? closuresLoad.data.map((dto) => ({ ...toClosure(dto), closedOn: dto.closedOn }))
      : [];
  const [editedClosures, setEditedClosures] = useState<FormClosure[] | null>(null);
  const closures = editedClosures ?? loadedClosures;
  const setClosures = (next: (current: FormClosure[]) => FormClosure[]) =>
    setEditedClosures((current) => next(current ?? loadedClosures));
  const [addOpen, setAddOpen] = useState(false);
  const [removingClosure, setRemovingClosure] = useState<FormClosure | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState<string | undefined>();
  // In-flight uploads only, never persisted: each id becomes a skeleton tile until the URL lands in form.images.
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Bumped to fly the pin map to a district's centre — see LocationPicker's `focusToken` prop for why it is not
  // just "whenever lat/lng changes".
  const [mapFocusToken, setMapFocusToken] = useState(0);
  // Latitude / longitude exactly as typed, until the field is left: re-formatting to 6 decimals on every keystroke made
  // the fields impossible to type in or clear (QA E2E v2 MARKET-ADMIN-002). Absent = show the form's number.
  const [coordText, setCoordText] = useState<Partial<Record<'lat' | 'lng', string>>>({});

  if (load.kind === 'loading') {
    return <MarketCardSkeleton count={1} />;
  }

  if (load.kind === 'error' && !missing) {
    return <LoadError noun={t('error.noun')} onRetry={retry} />;
  }

  if (missing) {
    return (
      <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-h2">{t('missing.title')}</h1>
        <p className="text-ink-muted">{t('missing.text')}</p>
        <ButtonLink to={ADMIN_MARKETS_PATH}>{t('allMarkets')}</ButtonLink>
      </div>
    );
  }

  const toggleDay = (dow: number) =>
    setForm((f) => ({ ...f, days: f.days.includes(dow) ? f.days.filter((d) => d !== dow) : [...f.days, dow].sort() }));

  /**
   * Jumps the pin (and the map beside it) to the district's centre, so placing it is scrolling from nearby, not from
   * wherever the previous market or the city default happened to leave the view.
   */
  const onDistrictChange = (name: string) => {
    const center = HCMC_DISTRICTS.find((d) => d.name === name);
    setForm((f) => (center ? { ...f, district: name, lat: center.lat, lng: center.lng } : { ...f, district: name }));
    if (center) {
      setCoordText({});
      setMapFocusToken((n) => n + 1);
    }
  };

  /** A whole "lat, lng" pasted into either field fills both; otherwise keep the text until the field is left. */
  const onCoordChange = (axis: 'lat' | 'lng', text: string) => {
    const pair = parseCoordinatePair(text);
    if (pair) {
      setForm((f) => ({ ...f, lat: pair.lat, lng: pair.lng }));
      setCoordText({});
      return;
    }
    setCoordText((c) => ({ ...c, [axis]: text }));
  };

  /** Leaving the field moves the pin there; text that is not a number stays as typed and is flagged on save. */
  const onCoordBlur = (axis: 'lat' | 'lng') => {
    const text = coordText[axis];
    if (text === undefined) return;
    const value = parseCoordinate(text);
    if (value === null) return;
    setForm((f) => ({ ...f, [axis]: value }));
    setCoordText((c) => {
      const next = { ...c };
      delete next[axis];
      return next;
    });
  };

  /** The form with any coordinate still being typed read in, so Save never uses a stale pin position. */
  const withTypedCoords = (f: FormState): FormState => ({
    ...f,
    lat: coordText.lat === undefined ? f.lat : (parseCoordinate(coordText.lat) ?? Number.NaN),
    lng: coordText.lng === undefined ? f.lng : (parseCoordinate(coordText.lng) ?? Number.NaN),
  });

  /** Uploads each chosen file right away (docs/prototype pattern for Become a Farmer's photos), one request per file. */
  const onImagesChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const room = MAX_IMAGES - form.images.length - uploadingImages.length;
    if (room <= 0) {
      Notification.error({ text: t('images.tooMany', { max: MAX_IMAGES }) });
      return;
    }
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      Notification.error({ text: t('images.tooMany', { max: MAX_IMAGES }) });
    }

    accepted.forEach(async (file) => {
      const id = `${Date.now()}-${Math.random()}`;
      setUploadingImages((prev) => [...prev, id]);
      try {
        const url = await CatalogApi.uploadMarketImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch (error) {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      } finally {
        setUploadingImages((prev) => prev.filter((x) => x !== id));
      }
    });
  };

  const removeImage = (url: string) => setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));

  /** The same rules the server applies (MarketRequest + MarketService), so nobody waits on a round trip to learn them. */
  const validate = (f: FormState): FormErrors => {
    const next: FormErrors = {};
    if (!f.name.trim()) next.name = t('error.required');
    if (!f.address.trim()) next.address = t('error.required');
    if (f.days.length === 0) next.days = t('error.days');
    if (!f.open) next.open = t('error.required');
    if (!f.close) next.close = t('error.required');
    if (f.open && f.close && f.close <= f.open) next.close = t('error.close');
    if (!isLatitude(f.lat)) next.lat = coordText.lat?.trim() === '' ? t('error.required') : t('error.lat');
    if (!isLongitude(f.lng)) next.lng = coordText.lng?.trim() === '' ? t('error.required') : t('error.lng');
    if (f.images.length === 0) next.images = t('error.images');
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (uploadingImages.length) {
      Notification.error({ text: t('images.uploadInProgress') });
      return;
    }
    const current = withTypedCoords(form);
    const found = validate(current);
    setErrors(found);
    if (Object.keys(found).length) {
      Notification.error({ title: t('toast.fixTitle'), text: t('toast.fix') });
      return;
    }

    const input: MarketInput = {
      marketName: form.name.trim(),
      address: form.address.trim(),
      district: form.district || undefined,
      latitude: current.lat,
      longitude: current.lng,
      openingTime: form.open,
      closingTime: form.close,
      images: form.images,
      operatingDays: form.days,
    };
    setSaving(true);
    try {
      const saved = existing ? await CatalogApi.updateMarket(existing.id, input) : await CatalogApi.createMarket(input);

      // Closed days only exist locally until now (mirror-until-edited, same as the rest of the form); sync the
      // difference against what the server had. Skipped entirely if the panel was never touched.
      if (editedClosures) {
        const loadedIds = new Set(loadedClosures.map((c) => c.id));
        const currentIds = new Set(editedClosures.map((c) => c.id));
        const toCreate = editedClosures.filter((c) => !loadedIds.has(c.id));
        const toRemove = loadedClosures.filter((c) => !currentIds.has(c.id));
        try {
          await Promise.all([
            ...toCreate.map((c) =>
              CatalogApi.createClosure(saved.id, {
                closedOn: c.closedOn,
                reason: c.reason || undefined,
                handling: c.handling,
              }),
            ),
            ...toRemove.map((c) => CatalogApi.deleteClosure(saved.id, c.id)),
          ]);
        } catch (closureError) {
          Notification.error({ text: Helper.getErrorMessage(closureError, tc('errors.network')) });
        }
      }

      Notification.success({ text: t('toast.saved', { name: saved.name }) });
      navigate(ADMIN_MARKETS_PATH);
    } catch (error) {
      const fromServer = Helper.getFieldErrors(error);
      const mapped: FormErrors = {};
      Object.entries(fromServer).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      setErrors(mapped);
      if (Object.keys(mapped).length) {
        Notification.error({ title: t('toast.fixTitle'), text: t('toast.fix') });
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      }
    } finally {
      setSaving(false);
    }
  };

  // The real market's district may not be in the short list above; keep it selectable rather than blanking the field.
  const districtOptions = [...new Set([...DISTRICTS, form.district].filter(Boolean))];

  /**
   * Adds the closed day to the list; it is only sent with the rest of the form on Save (QA E2E v2 MARKET-ADMIN-007: a
   * missing date used to produce "undefined/undefined/", and the toast did not say the day was not saved yet).
   */
  const addClosure = () => {
    const error = !draft.date
      ? t('closures.error.dateRequired')
      : draft.date < todayInHcmc()
        ? t('closures.error.datePast')
        : closures.some((c) => c.closedOn === draft.date)
          ? t('closures.error.dateTaken')
          : undefined;
    setDraftError(error);
    if (error) return;
    const date = parseIsoDate(draft.date);
    setClosures((list) => [
      ...list,
      {
        id: Date.now(),
        marketId: existing?.id ?? 0,
        closedOn: draft.date,
        date: formatDate(date),
        weekday: dayName(date.getDay(), 'long'),
        reason: draft.reason.trim(),
        handling: draft.handling,
        orders: 0,
        announced: false,
        by: t('closures.byAdminToday'),
      },
    ]);
    setAddOpen(false);
    setDraft(EMPTY_DRAFT);
    Notification.success({ text: t('closures.added') });
  };

  const removeClosure = () => {
    if (!removingClosure) return;
    setClosures((list) => list.filter((c) => c.id !== removingClosure.id));
    setRemovingClosure(null);
    Notification.success({ text: t('closures.removed') });
  };

  const closureColumns: TableColumn<FormClosure>[] = [
    {
      key: 'date',
      label: t('closures.col.date'),
      render: (c) => (
        <>
          <b>{c.date}</b>
          <span className="text-ink-muted block text-[13px]">{c.weekday}</span>
        </>
      ),
    },
    { key: 'reason', label: t('closures.col.reason') },
    {
      key: 'orders',
      label: t('closures.col.orders'),
      render: (c) =>
        c.orders ? (
          <>
            <b>{c.orders}</b> <span className="text-ink-muted text-[13px]">{t(`handling.${c.handling}.short`)}</span>
          </>
        ) : (
          <span className="text-ink-muted">{t('closures.noneYet')}</span>
        ),
    },
    {
      key: 'announced',
      label: t('closures.col.told'),
      render: (c) =>
        c.announced ? (
          <span className="bg-status-accepted-bg text-status-accepted-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <CheckIcon size={14} />
            {t('closures.announced')}
          </span>
        ) : (
          <span className="text-ink-muted">{t('closures.notYet')}</span>
        ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => (
        <Button variant="danger" size="sm" onClick={() => setRemovingClosure(c)}>
          {t('closures.remove')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_MARKETS_PATH} className="text-brand underline">
          {t('allMarkets')}
        </Link>{' '}
        · {isNew ? t('crumbNew') : t('crumbEdit')}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h2">{isNew ? t('titleNew') : existing?.name}</h1>
        {existing && (
          <span className="text-small text-ink-muted">
            {SHOW_WIP
              ? t('meta', { stalls: existing.stalls, added: marketAdmin[existing.id]?.added })
              : t('metaStalls', { stalls: existing.stalls })}
          </span>
        )}
      </div>

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
        noValidate
      >
        <Card className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="market-name"
              label={t('field.name')}
              required
              className="sm:col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <Field
              id="market-address"
              label={t('field.address')}
              required
              className="sm:col-span-2"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              error={errors.address}
            />
            <SelectField
              id="market-district"
              label={t('field.district')}
              value={form.district}
              onChange={(e) => onDistrictChange(e.target.value)}
              options={districtOptions}
            />
            <Field id="market-city" label={t('field.city')} value={t('city')} readOnly />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 sm:col-span-2">
              <legend className="text-small mb-1 p-0 font-bold">
                {t('field.days')}
                <span aria-hidden="true" className="text-danger ml-0.5">
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEK.map((dow) => (
                  <label key={dow} className="relative">
                    <input
                      type="checkbox"
                      checked={form.days.includes(dow)}
                      onChange={() => toggleDay(dow)}
                      className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                    />
                    <span
                      className={Helper.cn(
                        'border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-focus flex min-h-11 min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                      )}
                    >
                      {dayName(dow)}
                    </span>
                  </label>
                ))}
              </div>
              {errors.days && (
                <p role="alert" className="text-danger m-0 text-[13px]">
                  {errors.days}
                </p>
              )}
            </fieldset>

            <Field
              id="market-open"
              label={t('field.open')}
              required
              type="time"
              value={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.value })}
              error={errors.open}
            />
            <Field
              id="market-close"
              label={t('field.close')}
              required
              type="time"
              value={form.close}
              onChange={(e) => setForm({ ...form, close: e.target.value })}
              error={errors.close}
            />
            <Field
              id="market-lat"
              label={t('field.lat')}
              required
              inputMode="decimal"
              value={coordText.lat ?? form.lat.toFixed(6)}
              onChange={(e) => onCoordChange('lat', e.target.value)}
              onBlur={() => onCoordBlur('lat')}
              error={errors.lat}
            />
            <Field
              id="market-lng"
              label={t('field.lng')}
              required
              hint={t('field.lngHint')}
              inputMode="decimal"
              value={coordText.lng ?? form.lng.toFixed(6)}
              onChange={(e) => onCoordChange('lng', e.target.value)}
              onBlur={() => onCoordBlur('lng')}
              error={errors.lng}
            />

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="market-notes" className="text-small font-bold">
                {t('field.notes')}
              </label>
              <textarea
                id="market-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="border-line-strong bg-surface-raised focus:outline-focus min-h-18 rounded-sm border-[1.5px] p-3 focus:outline-2"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-small font-bold">
                {t('field.images')}
                <span aria-hidden="true" className="text-danger ml-0.5">
                  *
                </span>
              </span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onImagesChosen}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((url, i) => (
                  <div key={url} className="relative">
                    <img
                      src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${url}`}
                      alt={t('images.photoLabel', { n: i + 1 })}
                      className="aspect-4/3 w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                      aria-label={t('images.remove', { n: i + 1 })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {uploadingImages.map((id) => (
                  <span
                    key={id}
                    aria-hidden="true"
                    role="status"
                    aria-label={t('images.uploading')}
                    className="ml-skel aspect-4/3 w-full rounded-md"
                  />
                ))}
                {form.images.length + uploadingImages.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-ink border-line-strong aspect-4/3 w-full cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold"
                  >
                    {t('images.add')}
                  </button>
                )}
              </div>
              {errors.images ? (
                <p role="alert" className="text-danger m-0 text-[13px]">
                  {errors.images}
                </p>
              ) : (
                <p className="text-ink-muted text-[13px]">{t('images.hint', { max: MAX_IMAGES })}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <LocationPicker
            label={t('pin.label')}
            lat={form.lat}
            lng={form.lng}
            pinLabel={form.name || t('titleNew')}
            onMove={(lat, lng) => {
              setForm((f) => ({ ...f, lat, lng }));
              setCoordText({});
            }}
            focusToken={mapFocusToken}
            className="min-h-75"
          />
          <p className="text-ink-muted text-[13px]">{t('pin.note')}</p>
        </div>
      </form>

      <Card as="section" className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-160 flex-col gap-1">
            <h2 className="text-h3">{t('closures.title')}</h2>
            <p className="text-small text-ink-muted">{t('closures.intro')}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setDraftError(undefined);
              setAddOpen(true);
            }}
          >
            {t('closures.add')}
          </Button>
        </div>

        {closures.length ? (
          <Table columns={closureColumns} rows={closures} />
        ) : (
          <DataState fill title={t('closures.empty.title')} text={t('closures.empty.text')} />
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <ButtonLink to={ADMIN_MARKETS_PATH} variant="secondary">
          {t('action.cancel')}
        </ButtonLink>
        <Button type="submit" form={FORM_ID} disabled={saving}>
          {t('action.save')}
        </Button>
      </div>

      <Dialog
        open={addOpen}
        title={t('closures.add')}
        onClose={() => setAddOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={addClosure}>{t('closures.addConfirm')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field
            id="closure-date"
            label={t('closures.field.date')}
            type="date"
            required
            min={todayInHcmc()}
            value={draft.date}
            onChange={(e) => {
              setDraft({ ...draft, date: e.target.value });
              setDraftError(undefined);
            }}
            error={draftError}
          />
          <Field
            id="closure-reason"
            label={t('closures.field.reason')}
            placeholder={t('closures.field.reasonPlaceholder')}
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
          />
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="text-small mb-1 p-0 font-bold">{t('closures.field.handling')}</legend>
            {CLOSURE_HANDLINGS.map((key) => (
              <label key={key} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="closure-handling"
                  checked={draft.handling === key}
                  onChange={() => setDraft({ ...draft, handling: key })}
                  className="accent-brand mt-1 size-4.5 flex-none cursor-pointer"
                />
                <span className="text-[15px]">
                  <b>{t(`handling.${key}.title`)}</b>
                  <small className="text-ink-muted block text-[13px]">{t(`handling.${key}.text`)}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </Dialog>

      <Dialog
        open={removingClosure !== null}
        tone="danger"
        title={t('closures.removeTitle')}
        onClose={() => setRemovingClosure(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemovingClosure(null)}>
              {t('closures.keep')}
            </Button>
            <Button variant="danger" onClick={removeClosure}>
              {t('closures.remove')}
            </Button>
          </>
        }
      >
        <p>{t('closures.removeText')}</p>
      </Dialog>
    </div>
  );
};

export default AdminMarketFormPage;
