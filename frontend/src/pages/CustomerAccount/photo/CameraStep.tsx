import { useEffect, useRef, useState } from 'react';
import { Banner } from '@/components/ui/banner';

type CameraStepProps = {
  /** Nhận element video đang phát để dialog chụp khung hình. */
  onReady: (video: HTMLVideoElement | null) => void;
};

type CameraError = { title: string; text: string };

const cameraError = (error: unknown): CameraError => {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      title: 'Camera access is blocked.',
      text: 'Allow the camera for this site in your browser settings, or upload a photo instead.',
    };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { title: 'No camera was found.', text: 'Plug one in, or upload a photo instead.' };
  }
  if (name === 'NotReadableError') {
    return { title: 'The camera is busy.', text: 'Close other apps using it and try again, or upload a photo.' };
  }
  return { title: 'The camera could not start.', text: 'Try again, or upload a photo instead.' };
};

/** Xem trước camera trước (lật như gương cho dễ canh), tắt camera ngay khi rời bước này. */
const CameraStep = ({ onReady }: CameraStepProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    // getUserMedia chỉ có trên https hoặc localhost
    if (!navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- trình duyệt không hỗ trợ, báo ngay
      setError({
        title: 'This browser cannot open the camera here.',
        text: 'The camera needs a secure (https) page. Upload a photo instead.',
      });
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
      <Banner variant="warning" title={error.title}>
        {error.text}
      </Banner>
    );
  }

  return (
    <div className="bg-board relative aspect-square w-full overflow-hidden rounded-md">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera preview"
        className="size-full -scale-x-100 object-cover"
      />
      {starting && (
        <p className="text-on-board text-small absolute inset-0 grid place-items-center" role="status">
          Starting the camera…
        </p>
      )}
    </div>
  );
};

export default CameraStep;
