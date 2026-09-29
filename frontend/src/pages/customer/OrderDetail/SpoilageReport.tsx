import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderItemDto } from '@/api-requests/order.requests';
import QualityReportApi, {
  QUALITY_PROBLEMS,
  reportPhotoSrc,
  type ItemQualityReportDto,
  type QualityProblem,
} from '@/api-requests/quality-report.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { canReportSpoilage, spoiledOnChoices } from '@/lib/spoilage';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const NOTE_MAX = 500;

type ReportErrors = Partial<Record<'day' | 'problem' | 'note' | 'photo', string>>;

const SERVER_FIELDS: Record<string, keyof ReportErrors> = {
  spoiledOn: 'day',
  problem: 'problem',
  note: 'note',
  photoUrl: 'photo',
  file: 'photo',
};

type SpoilageActionProps = {
  item: OrderItemDto;
  status: OrderStatus;
  today: string;
  pickupDate: string;
  onReport: () => void;
};

export function SpoilageAction({ item, status, today, pickupDate, onReport }: SpoilageActionProps) {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  if (item.qualityReport) {
    return (
      <span className="text-small text-ink-muted block">
        {t('spoilage.reported', { status: tc(`spoilage.status.${item.qualityReport.status}`) })}
      </span>
    );
  }
  if (!canReportSpoilage(status, item, today, pickupDate)) return null;
  return (
    <span className="mt-1 block">
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('spoilage.reportLabel', { name: item.productName })}
        onClick={onReport}
      >
        {t('spoilage.report')}
      </Button>
    </span>
  );
}

type SpoilageReportDialogProps = {
  orderId: number;
  itemId: number;
  productName: string;
  stallName: string;
  pickupDate: string;
  today: string;
  onClose: () => void;
  onSent: (report: ItemQualityReportDto) => void;
};

export function SpoilageReportDialog({
  orderId,
  itemId,
  productName,
  stallName,
  pickupDate,
  today,
  onClose,
  onSent,
}: SpoilageReportDialogProps) {
  const { t } = useTranslation('CustomerOrderDetail');
  const { t: tc } = useTranslation();
  const days = spoiledOnChoices(pickupDate, today).reverse();
  const [day, setDay] = useState(days[0] ?? today);
  const [problem, setProblem] = useState<QualityProblem | null>(null);
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [failure, setFailure] = useState<string>();

  const choosePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: t('spoilage.photoType') }));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, photo: t('spoilage.photoTooBig') }));
      return;
    }
    setUploading(true);
    setErrors((prev) => ({ ...prev, photo: undefined }));
    try {
      setPhotoUrl(await QualityReportApi.uploadPhoto(file));
    } catch (error) {
      const message = Helper.getFieldErrors(error).file ?? Helper.getErrorMessage(error, tc('errors.network'));
      setErrors((prev) => ({ ...prev, photo: message }));
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!problem) return;
    setSending(true);
    setFailure(undefined);
    try {
      const report = await QualityReportApi.create(orderId, itemId, {
        spoiledOn: day,
        problem,
        note: note.trim() || undefined,
        photoUrl,
      });
      Notification.success({ text: t('spoilage.sent') });
      onSent(report);
    } catch (error) {
      const mapped: ReportErrors = {};
      Object.entries(Helper.getFieldErrors(error)).forEach(([field, message]) => {
        const key = SERVER_FIELDS[field];
        if (key) mapped[key] = message;
      });
      if (Object.keys(mapped).length) setErrors(mapped);
      else setFailure(Helper.getErrorMessage(error, t('spoilage.failed')));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open
      title={t('spoilage.title')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={() => void send()}
            disabled={!problem || uploading || sending}
            aria-describedby={problem ? undefined : 'spoilage-why'}
          >
            {t('spoilage.send')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>{t('spoilage.intro', { stall: stallName, name: productName })}</p>
        <SelectField
          id="spoilage-day"
          label={t('spoilage.day')}
          required
          value={day}
          onChange={(e) => setDay(e.target.value)}
          options={days.map((d) => ({ value: d, label: stockDay(d) ?? d }))}
          error={errors.day}
        />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-small mb-1 p-0 font-bold">{t('spoilage.problem')}</legend>
          <div className="flex flex-wrap gap-2">
            {QUALITY_PROBLEMS.map((p) => (
              <Chip key={p} pressed={problem === p} onClick={() => setProblem(p)}>
                {tc(`spoilage.problem.${p}`)}
              </Chip>
            ))}
          </div>
          {errors.problem && (
            <span role="alert" className="text-danger text-[13px] font-bold">
              {errors.problem}
            </span>
          )}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="spoilage-note" className="text-small font-bold">
            {t('spoilage.note')}
          </label>
          <textarea
            id="spoilage-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('spoilage.notePlaceholder')}
            aria-describedby="spoilage-note-count"
            className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
          />
          <span
            id="spoilage-note-count"
            role={errors.note ? 'alert' : undefined}
            className={Helper.cn('text-[13px]', errors.note ? 'text-danger font-bold' : 'text-ink-muted')}
          >
            {errors.note ?? t('spoilage.noteCount', { used: note.length })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {photoUrl && (
            <div className="relative self-start">
              <img
                src={reportPhotoSrc(photoUrl)}
                alt={t('spoilage.photoAlt')}
                className="border-line size-24 rounded-sm border object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoUrl(undefined)}
                aria-label={t('spoilage.photoRemove')}
                className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
              >
                ×
              </button>
            </div>
          )}
          <label
            htmlFor="spoilage-photo"
            className={Helper.cn(
              'border-line-strong bg-surface-raised text-small inline-flex min-h-9 cursor-pointer items-center self-start rounded-sm border-[1.5px] px-3 font-bold',
              uploading && 'opacity-60',
            )}
          >
            {uploading ? t('spoilage.uploading') : photoUrl ? t('spoilage.photoReplace') : t('spoilage.photo')}
          </label>
          <input
            id="spoilage-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void choosePhoto(e)}
          />
          <span
            role={errors.photo ? 'alert' : undefined}
            className={Helper.cn('text-[13px]', errors.photo ? 'text-danger font-bold' : 'text-ink-muted')}
          >
            {errors.photo ?? t('spoilage.photoHint')}
          </span>
        </div>
        {!problem && (
          <span id="spoilage-why" className="text-ink-muted text-[13px]">
            {t('spoilage.needProblem')}
          </span>
        )}
        {failure && (
          <p role="alert" className="text-danger text-small">
            {failure}
          </p>
        )}
      </div>
    </Dialog>
  );
}
