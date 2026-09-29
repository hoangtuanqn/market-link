import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import GeoApi from '@/api-requests/geo.requests';
import { Button } from '@/components/ui/button';
import { Field, SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import { VIETNAM, type AddressErrors, type AddressParts, type CountryOption } from '@/types/address.types';
import StreetCombobox from './StreetCombobox';

type AddressFieldsProps = {
  /** Prefix for the ids of the inputs, so two address blocks can share a page. */
  idPrefix: string;
  value: AddressParts;
  onChange: (next: AddressParts) => void;
  errors?: AddressErrors;
  disabled?: boolean;
  /** Markets: the country is fixed to Vietnam, customers pick up there. */
  lockCountry?: boolean;
  /** Accounts need a house number; a market may be just "Lê Lợi". */
  lineRequired?: boolean;
  /** The plain-text address of an account saved before addresses had parts. */
  legacyAddress?: string;
};

const NO_OPTIONS: never[] = [];

/** Only Vietnam is on a locked form, so the country list is not worth a request there. */
const VIETNAM_ONLY: CountryOption[] = [{ code: VIETNAM, name: 'Vietnam' }];

/**
 * Address block shared by every form (FR-001, FR-073): Country → Province → Ward → Street → house number in Vietnam
 * (two levels since 01/07/2025), Country → State → City → address abroad. Changing the country clears everything after
 * it; changing the province clears the ward and the street, which belong to it.
 */
export default function AddressFields({
  idPrefix,
  value,
  onChange,
  errors = {},
  disabled,
  lockCountry,
  lineRequired = true,
  legacyAddress,
}: AddressFieldsProps) {
  const { t, i18n } = useTranslation();
  const vietnam = value.countryCode === VIETNAM;
  const provinceCode = value.provinceCode ?? '';

  const countries = useRequest(`geo:countries:${lockCountry ? 'vn' : 'all'}`, () =>
    lockCountry ? Promise.resolve(VIETNAM_ONLY) : GeoApi.countries(),
  );
  const provinces = useRequest(`geo:provinces:${vietnam}`, () =>
    vietnam ? GeoApi.provinces() : Promise.resolve(NO_OPTIONS),
  );
  const wards = useRequest(`geo:wards:${vietnam ? provinceCode : ''}`, () =>
    vietnam && provinceCode ? GeoApi.wards(provinceCode) : Promise.resolve(NO_OPTIONS),
  );

  const language = i18n.resolvedLanguage ?? 'en';
  const countryOptions = useMemo(() => {
    const list = countries.state.kind === 'ready' ? countries.state.data : VIETNAM_ONLY;
    // The browser names every country in the reader's language from its code; the English name is the fallback
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([language], { type: 'region' });
    } catch {
      names = null;
    }
    return list
      .map((c) => ({ value: c.code, label: names?.of(c.code) ?? c.name }))
      .sort((a, b) => (a.value === VIETNAM ? -1 : b.value === VIETNAM ? 1 : a.label.localeCompare(b.label, language)));
  }, [countries.state, language]);

  const id = (part: string) => `${idPrefix}-${part}`;
  const set = (patch: Partial<AddressParts>) => onChange({ ...value, ...patch });

  const listOptions = (state: typeof provinces.state, placeholder: string): { value: string; label: string }[] =>
    state.kind === 'ready'
      ? // The short name ("Bến Thành", not "Phường Bến Thành"): a native select jumps to the letter typed, and every
        // full name would start with "Phường" / "Xã" / "Tỉnh". The full name is what the composed address shows.
        [{ value: '', label: placeholder }, ...state.data.map((o) => ({ value: o.code, label: o.name }))]
      : [{ value: '', label: state.kind === 'loading' ? t('address.loading') : t('address.loadFailed') }];

  return (
    <fieldset className="m-0 flex flex-col gap-4 border-0 p-0" disabled={disabled}>
      <legend className="text-small text-ink mb-2 p-0 font-bold">{t('address.legend')}</legend>
      {legacyAddress && (
        <p className="text-small text-ink-muted bg-surface-sunken m-0 rounded-sm p-3">
          {t('address.current', { address: legacyAddress })}
        </p>
      )}

      {((!lockCountry && countries.state.kind === 'error') ||
        (vietnam && provinces.state.kind === 'error') ||
        (vietnam && Boolean(provinceCode) && wards.state.kind === 'error')) && (
        <div className="border-danger/40 bg-danger/10 flex flex-wrap items-center justify-between gap-2 rounded-sm border px-3 py-2 text-[13px]">
          <span role="alert" className="text-danger font-bold">
            {t('address.loadFailed')}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (countries.state.kind === 'error') countries.retry();
              if (provinces.state.kind === 'error') provinces.retry();
              if (wards.state.kind === 'error') wards.retry();
            }}
          >
            {t('address.retry')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          id={id('country')}
          label={t('address.country')}
          required
          autoComplete="country"
          value={value.countryCode}
          disabled={lockCountry || countries.state.kind !== 'ready' || disabled}
          hint={lockCountry ? t('address.vietnamOnly') : undefined}
          error={errors.countryCode}
          onChange={(e) => onChange({ countryCode: e.target.value })}
          options={countryOptions}
        />

        {vietnam ? (
          <>
            <SelectField
              id={id('province')}
              label={t('address.province')}
              required
              autoComplete="address-level1"
              value={provinceCode}
              disabled={provinces.state.kind !== 'ready' || disabled}
              error={errors.provinceCode}
              onChange={(e) =>
                onChange({
                  countryCode: value.countryCode,
                  provinceCode: e.target.value || undefined,
                  addressLine: value.addressLine,
                })
              }
              options={listOptions(provinces.state, t('address.choose.province'))}
            />
            <SelectField
              id={id('ward')}
              label={t('address.ward')}
              required
              autoComplete="address-level2"
              value={value.wardCode ?? ''}
              disabled={!provinceCode || wards.state.kind !== 'ready' || disabled}
              hint={provinceCode ? undefined : t('address.wardNeedsProvince')}
              error={errors.wardCode}
              onChange={(e) => set({ wardCode: e.target.value || undefined })}
              options={
                provinceCode
                  ? listOptions(wards.state, t('address.choose.ward'))
                  : [{ value: '', label: t('address.choose.ward') }]
              }
            />
            <StreetCombobox
              id={id('street')}
              label={t('address.street')}
              required
              provinceCode={provinceCode}
              value={value.streetName ?? ''}
              onChange={(streetName) => set({ streetName })}
              error={errors.streetName}
              hint={t('address.streetHint')}
              disabled={disabled}
            />
          </>
        ) : (
          <>
            <Field
              id={id('region')}
              label={t('address.region')}
              required
              autoComplete="address-level1"
              value={value.regionName ?? ''}
              onChange={(e) => set({ regionName: e.target.value })}
              error={errors.regionName}
            />
            <Field
              id={id('city')}
              label={t('address.city')}
              required
              autoComplete="address-level2"
              value={value.cityName ?? ''}
              onChange={(e) => set({ cityName: e.target.value })}
              error={errors.cityName}
            />
          </>
        )}

        <Field
          id={id('line')}
          label={lineRequired ? t('address.addressLine') : t('address.addressLineOptional')}
          required={lineRequired}
          autoComplete="address-line1"
          placeholder={vietnam ? t('address.addressLinePlaceholder') : undefined}
          value={value.addressLine ?? ''}
          onChange={(e) => set({ addressLine: e.target.value })}
          error={errors.addressLine}
          containerClassName="md:col-span-2"
        />
      </div>
    </fieldset>
  );
}
