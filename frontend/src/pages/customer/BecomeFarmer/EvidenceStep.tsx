import type { ChangeEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormStep } from '@/components/ui/form-step';
import { VideoThumb } from '@/components/VideoThumb';
import { PHOTO_MAX_MB, VIDEO_MAX_MB, type PhotoSlot, type VideoSlot } from './constants';

type EvidenceStepProps = {
  photos: PhotoSlot[];
  video: VideoSlot;
  photoError?: string;
  isSubmitting: boolean;
  photoInputRef: RefObject<HTMLInputElement | null>;
  videoInputRef: RefObject<HTMLInputElement | null>;
  onPhotoChosen: (e: ChangeEvent<HTMLInputElement>) => void;
  onVideoChosen: (e: ChangeEvent<HTMLInputElement>) => void;
  onPickPhoto: (index: number) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveVideo: () => void;
};

/** Step 2: up to three photos (the first is required) and an optional video of the stall or the farm. */
const EvidenceStep = ({
  photos,
  video,
  photoError,
  isSubmitting,
  photoInputRef,
  videoInputRef,
  onPhotoChosen,
  onVideoChosen,
  onPickPhoto,
  onRemovePhoto,
  onRemoveVideo,
}: EvidenceStepProps) => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  return (
    <FormStep n={2} title={t('step2.title')}>
      <Card className="flex flex-col gap-4 p-6">
        <p className="text-body">{t('step2.intro')}</p>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPhotoChosen}
        />
        <div id="photos" className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {photos.map((p, i) => (
              // The label under each slot was dropped; images still need a name for screen readers so they are numbered.
              <div key={p.key}>
                {p.url ? (
                  <div className="relative">
                    <img
                      src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${p.url}`}
                      alt={t('step2.photoLabel', { n: i + 1 })}
                      className="aspect-4/3 w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onRemovePhoto(i)}
                      className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                      aria-label={t('step2.removePhoto', { label: t('step2.photoLabel', { n: i + 1 }) })}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPickPhoto(i)}
                    disabled={p.uploading || isSubmitting}
                    aria-label={t('step2.addPhotoLabel', { n: i + 1 })}
                    aria-invalid={i === 0 && !!photoError}
                    className={`text-ink aspect-4/3 w-full cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold disabled:opacity-50 ${
                      i === 0 && photoError ? 'border-danger' : 'border-line-strong'
                    }`}
                  >
                    {p.uploading ? t('step2.uploading') : t('step2.addPhoto')}
                  </button>
                )}
              </div>
            ))}
          </div>
          <span
            role={photoError ? 'alert' : undefined}
            className={`text-[13px] ${photoError ? 'text-danger' : 'text-ink-muted'}`}
          >
            {photoError ?? t('step2.photoHint', { max: PHOTO_MAX_MB })}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vid" className="text-small font-bold">
            {t('step2.video')}
          </label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={onVideoChosen}
          />
          {video.url ? (
            <div className="flex flex-wrap items-center gap-3">
              <VideoThumb url={video.url} poster={video.poster} big />
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-small">{t('step2.videoAdded')}</span>
                <Button variant="secondary" size="sm" type="button" disabled={isSubmitting} onClick={onRemoveVideo}>
                  {t('step2.removeVideo')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              id="vid"
              type="button"
              disabled={video.uploading || isSubmitting}
              onClick={() => videoInputRef.current?.click()}
              className="w-fit"
            >
              {video.uploading ? t('step2.uploading') : t('step2.addVideo')}
            </Button>
          )}
          <span className="text-ink-muted text-[13px]">
            {t('step2.videoHint')} {t('step2.videoLimit', { max: VIDEO_MAX_MB })}
          </span>
        </div>
        <Banner title={t('step2.banner.title')}>{t('step2.banner.text')}</Banner>
      </Card>
    </FormStep>
  );
};

export default EvidenceStep;
