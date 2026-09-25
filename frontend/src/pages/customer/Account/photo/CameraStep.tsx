import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner } from '@/components/ui/banner';

type CameraStepProps = {
  /** Nhận element video đang phát để dialog chụp khung hình. */
  onReady: (video: HTMLVideoElement | null) => void;
};

/** Why the camera is not showing; the step shows `CustomerAccount:camera.<code>.title / .text`. */
type CameraError = 'blocked' | 'notFound' | 'busy' | 'failed' | 'insecure';

const cameraError = (error: unknown): CameraError => {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notFound';
  if (name === 'NotReadableError') return 'busy';
  return 'failed';
};

/** Xem trước camera trước (lật như gương cho dễ canh), tắt camera ngay khi rời bước này. */
const CameraStep = ({ onReady }: CameraStepProps) => {
  const { t } = useTranslation('CustomerAccount');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    // getUserMedia chỉ có trên https hoặc localhost
    if (!navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- trình duyệt không hỗ trợ, báo ngay
      setError('insecure');
      setStarting(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play().catch(() => undefined);
        setStarting(false);
        onReady(video);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(cameraError(e));
        setStarting(false);
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      onReady(null);
    };
  }, [onReady]);

  if (error) {
    return (
      <Banner variant="warning" title={t(`camera.${error}.title`)}>
        {t(`camera.${error}.text`)}
      </Banner>
    );
  }

  return (
    <div className="bg-board relative aspect-square w-full overflow-hidden rounded-md">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label={t('camera.preview')}
        className="size-full -scale-x-100 object-cover"
      />
      {starting && (
        <p className="text-on-board text-small absolute inset-0 grid place-items-center" role="status">
          {t('camera.starting')}
        </p>
      )}
    </div>
  );
};

export default CameraStep;
