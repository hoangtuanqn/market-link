import { useTranslation } from 'react-i18next';
import { VideoThumb } from '@/components/VideoThumb';
import { APPROVAL_STATUS_META } from '@/constants/approvalStatus';
import { formatDate } from '@/lib/format';
import type { FarmerApplicationAttemptType, FarmerApproval } from '@/types/farmer.types';
import Helper from '@/utils/helper';

type ApplicationHistoryProps = {
  entries: FarmerApplicationAttemptType[];
  /**
   * Nhãn trạng thái do trang gọi cung cấp: Admin đọc "Waiting for approval", người nộp đọc "Pending" — cùng một trạng
   * thái nhưng hai cách nói, nên không gom vào đây.
   */
  statusLabel: (status: FarmerApproval) => string;
};

const fileUrl = (path: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${path}`;

/**
 * Lịch sử nộp đơn xin thành Farmer: mỗi lần nộp là một thẻ với nội dung lúc đó, kết quả và lý do bị từ chối. Dùng chung
 * cho trang của người nộp và trang duyệt của Admin, để hai bên nhìn cùng một thứ.
 */
export function ApplicationHistory({ entries, statusLabel }: ApplicationHistoryProps) {
  const { t } = useTranslation();

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {entries.map((entry) => {
        const meta = APPROVAL_STATUS_META[entry.status];
        const Icon = meta.icon;
        return (
          <li key={entry.id} className="border-line-strong bg-surface-raised rounded-md border-[1.5px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[15px]">{t('application.attempt', { n: entry.attempt })}</b>
                <span className="text-ink-muted text-[15px]">· {entry.stallName}</span>
              </div>
              <span
                className={Helper.cn(
                  'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
                  meta.className,
                )}
              >
                <Icon size={14} />
                {statusLabel(entry.status)}
              </span>
            </div>

            <p className="text-ink-muted m-0 mt-1 text-[13px]">
              {t('application.sentOn', { date: formatDate(new Date(entry.submittedAt)) })}
              {entry.decidedAt && ` · ${t('application.answeredOn', { date: formatDate(new Date(entry.decidedAt)) })}`}
            </p>

            {entry.rejectReason && (
              <p className="text-danger m-0 mt-2 text-[14px]">
                <b>{t('application.reason')}</b> {entry.rejectReason}
              </p>
            )}

            {(!!entry.photoUrls?.length || entry.videoUrl) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {entry.photoUrls?.map((url) => (
                  <img
                    key={url}
                    src={fileUrl(url)}
                    alt={t('application.photoAlt', { n: entry.attempt })}
                    className="border-line-strong size-16 rounded-sm border-[1.5px] object-cover"
                  />
                ))}
                {entry.videoUrl && <VideoThumb url={entry.videoUrl} className="size-16" />}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default ApplicationHistory;
