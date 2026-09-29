import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportPhotoSrc, type QualityProblem } from '@/api-requests/quality-report.requests';

type QualityReportFactsProps = {
  problem: QualityProblem;
  note?: string | null;
  shelfLifeExtended: boolean;
  extendedByDays: number;
  photoUrl?: string | null;
  photoAlt: string;
  dates: ReactNode;
};

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
