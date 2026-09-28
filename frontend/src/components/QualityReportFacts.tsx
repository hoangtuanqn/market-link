import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportPhotoSrc, type QualityProblem } from '@/api-requests/quality-report.requests';

type QualityReportFactsProps = {
  problem: QualityProblem;
  note?: string | null;
  shelfLifeExtended: boolean;
  extendedByDays: number;
  photoUrl?: string | null;
  /** Alt text for the customer's photo; each page phrases it in its own copy. */
  photoAlt: string;
  /** The pickup / good-until / spoiled-on line, already translated by the page in its own namespace. */
  dates: ReactNode;
};

/**
 * FR-122 / FR-123 (spec §4.4) — the read-only facts of one quality report that the farmer's and the admin's report
 * cards both show: the "Extended +N days" chip, the dates line, the problem/note line and the customer's photo.
 * Role-specific parts (the reply box, the decision controls) stay in each page.
 */
export default function QualityReportFacts({
  problem,
  note,
  shelfLifeExtended,
  extendedByDays,
  photoUrl,
  photoAlt,
  dates,
}: QualityReportFactsProps) {
  const { t } = useTranslation();
  return (
    <>
      {shelfLifeExtended && (
        <span className="bg-warning-bg text-warning-ink self-start rounded-full px-2 text-[13px] font-bold">
          {t('spoilage.extended', { count: extendedByDays })}
        </span>
      )}
      <p className="text-small text-ink-muted">{dates}</p>
      <p>
        {note
          ? t('spoilage.problemWithNote', { problem: t(`spoilage.problem.${problem}`), note })
          : t(`spoilage.problem.${problem}`)}
      </p>
      {photoUrl && (
        <a href={reportPhotoSrc(photoUrl)} target="_blank" rel="noreferrer" className="self-start">
          <img
            src={reportPhotoSrc(photoUrl)}
            alt={photoAlt}
            className="border-line size-24 rounded-sm border object-cover"
          />
        </a>
      )}
    </>
  );
}
