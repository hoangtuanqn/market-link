import { useTranslation } from 'react-i18next';
import type { ShelfLifeGroupDto, StorageMode } from '@/api-requests/shelf-life.requests';
import { Banner } from '@/components/ui/banner';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import { extendedBy, maxShelfLifeDays } from '@/lib/shelfLife';

export type ShelfLifeFieldProps = {
  groups: ShelfLifeGroupDto[];
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  /** The category's own range, shown when it has no groups yet. */
  categoryRange: { min: number; max: number } | null;
  groupName: string | null;
  storageMode: StorageMode;
  suggestedDays: number;
  peerMedianDays: number | null;
  days: number;
  acknowledged: boolean;
  /** The saved group is no longer offered: only the group select shows, empty, until the Farmer picks one. */
  groupGone: boolean;
  errors: { group?: string; mode?: string; days?: string; ack?: string };
  onGroup: (groupName: string) => void;
  onMode: (mode: StorageMode, suggestedDays: number) => void;
  onDays: (days: number) => void;
  onAcknowledge: (value: boolean) => void;
};

const MODES: StorageMode[] = ['room', 'chilled'];

/**
 * FR-120, FR-121 — the product form's storage block (spec §4.2): the group, how it is kept (each way with its suggested
 * days), a stepper capped at twice the suggestion, and the promise a longer shelf life needs.
 */
const ShelfLifeField = ({
  groups,
  loading,
  loadFailed,
  onRetry,
  categoryRange,
  groupName,
  storageMode,
  suggestedDays,
  peerMedianDays,
  days,
  acknowledged,
  groupGone,
  errors,
  onGroup,
  onMode,
  onDays,
  onAcknowledge,
}: ShelfLifeFieldProps) => {
  const { t } = useTranslation('FarmerProductForm');
  const { t: tc } = useTranslation();

  if (loading) {
    return (
      <p role="status" className="text-ink-muted text-small md:col-span-2">
        {t('shelfLife.loading')}
      </p>
    );
  }
  if (loadFailed) {
    return (
      <div className="md:col-span-2">
        <LoadError noun={t('shelfLife.noun')} onRetry={onRetry} />
      </div>
    );
  }

  const groupOptions = groups.map((g) => ({ value: g.groupName, label: g.groupName }));
  if (groupGone) {
    // Spec §8: the saved group is no longer offered. The select starts empty, so picking any group is a change the
    // Farmer makes (the one the name matches included), and the rest of the block waits for that pick.
    return (
      <div className="md:col-span-2">
        <SelectField
          id="shelf-group"
          label={t('shelfLife.group')}
          required
          value=""
          onChange={(e) => e.target.value && onGroup(e.target.value)}
          options={[{ value: '', label: t('shelfLife.pickGroup') }, ...groupOptions]}
          error={errors.group ?? t('shelfLife.groupGone')}
        />
      </div>
    );
  }

  const group = groups.find((g) => g.groupName === groupName);
  // No groups: both ways of keeping are offered with the category's upper bound as the suggestion.
  const modes = group
    ? group.modes.map((m) => ({ mode: m.storageMode, suggested: m.suggestedDays }))
    : MODES.map((mode) => ({ mode, suggested: suggestedDays }));
  const max = maxShelfLifeDays(suggestedDays);
  const longer = extendedBy(days, suggestedDays);
  const storageLabel = tc(`storageMode.${storageMode}`);

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      {groups.length > 0 ? (
        <SelectField
          id="shelf-group"
          label={t('shelfLife.group')}
          required
          value={groupName ?? ''}
          onChange={(e) => onGroup(e.target.value)}
          options={groupOptions}
          hint={group?.examples ? t('shelfLife.examples', { examples: group.examples }) : undefined}
          error={errors.group}
        />
      ) : (
        categoryRange && (
          <p className="text-ink-muted text-small">
            {t('shelfLife.fallback', { min: categoryRange.min, max: categoryRange.max })}
          </p>
        )
      )}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="text-small mb-1 p-0 font-bold">{t('shelfLife.storage')}</legend>
        <div className="flex flex-wrap gap-2">
          {modes.map(({ mode, suggested }) => (
            <label
              key={mode}
              className="border-line-strong has-[:checked]:bg-brand has-[:checked]:text-on-brand has-[:focus-visible]:outline-focus inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-[1.5px] px-3 has-[:focus-visible]:outline-2"
            >
              <input
                type="radio"
                name="storage-mode"
                className="sr-only"
                checked={storageMode === mode}
                onChange={() => onMode(mode, suggested)}
              />
              {`${tc(`storageMode.${mode}`)} · ${t('shelfLife.suggested', { count: suggested })}`}
            </label>
          ))}
        </div>
        {errors.mode && <span className="text-danger text-[13px] font-bold">{errors.mode}</span>}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-small font-bold">{t('shelfLife.label')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="border-line-strong bg-surface-raised inline-flex items-center rounded-sm border-[1.5px]">
            <button
              type="button"
              aria-label={t('shelfLife.decrease')}
              disabled={days <= 1}
              onClick={() => onDays(days - 1)}
              className="disabled:text-line-strong grid size-11 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
            >
              −
            </button>
            <output
              role="status"
              aria-label={t('shelfLife.label')}
              className="min-w-16 text-center font-bold tabular-nums"
            >
              {t('shelfLife.days', { count: days })}
            </output>
            <button
              type="button"
              aria-label={t('shelfLife.increase')}
              disabled={days >= max}
              onClick={() => onDays(days + 1)}
              className="disabled:text-line-strong grid size-11 cursor-pointer place-items-center rounded-sm bg-transparent text-[20px] leading-none disabled:cursor-not-allowed"
            >
              +
            </button>
          </span>
          {peerMedianDays != null && (
            <span className="text-ink-muted text-small">{t('shelfLife.peers', { count: peerMedianDays })}</span>
          )}
        </div>
        {errors.days && <span className="text-danger text-[13px] font-bold">{errors.days}</span>}
        {days < suggestedDays && <span className="text-ink-muted text-[13px]">{t('shelfLife.shorter')}</span>}
      </div>

      {longer > 0 && (
        <Banner
          variant="warning"
          title={t('shelfLife.longerTitle', {
            count: longer,
            // Pluralised on its own, so a one-day suggestion reads "1 day"
            suggested: t('shelfLife.days', { count: suggestedDays }),
            storage: storageLabel,
          })}
        >
          <Checkbox id="shelf-ack" checked={acknowledged} onChange={(e) => onAcknowledge(e.target.checked)}>
            {t('shelfLife.ackLabel', { days, storage: storageLabel })}
          </Checkbox>
          {errors.ack && <span className="text-danger block text-[13px] font-bold">{errors.ack}</span>}
        </Banner>
      )}
    </div>
  );
};

export default ShelfLifeField;
