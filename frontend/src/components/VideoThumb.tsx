import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import Helper from '@/utils/helper';

type VideoThumbProps = {
  /** A path returned by the server, e.g. `/uploads/farmer-applications/abc.mp4`. */
  url: string;
  /**
   * A frame built ahead from the file on the machine. Only available right when the user has just picked the video;
   * when read back from the server it cannot be built with a canvas (different origin) so leave it empty and the video
   * tag takes the first frame itself.
   */
  poster?: string | null;
  /** Tile size: square by default to line up with images in a row, `size` for a larger tile in a form. */
  className?: string;
  big?: boolean;
};

const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** A video's thumbnail with a review dialog, shared by the applicant and the reviewing Admin. */
export function VideoThumb({ url, poster, className, big = false }: VideoThumbProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const src = `${apiBase()}${url}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('video.play')}
        className={Helper.cn(
          'group border-line-strong bg-surface-sunken relative cursor-pointer overflow-hidden border-[1.5px] p-0',
          big ? 'aspect-4/3 w-40 rounded-md' : 'size-20 rounded-sm',
          className,
        )}
      >
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          // #t=0.5 makes the browser seek to half a second and draw that frame — the 0-second frame is often black.
          <video src={`${src}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
        )}
        <span
          aria-hidden="true"
          className={Helper.cn(
            'bg-ink/55 text-on-brand absolute inset-0 m-auto grid place-items-center rounded-full transition group-hover:scale-110',
            big ? 'size-11' : 'size-8',
          )}
        >
          <PlayIcon size={big ? 20 : 14} />
        </span>
      </button>

      <Dialog
        open={open}
        title={t('video.preview')}
        onClose={() => setOpen(false)}
        actions={
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            {t('video.close')}
          </Button>
        }
      >
        {/* Only build the video tag when the dialog is open: closing removes it from the DOM, so sound does not keep playing behind it. */}
        {open && (
          <video
            src={src}
            poster={poster ?? undefined}
            controls
            autoPlay
            playsInline
            className="max-h-[70vh] w-[min(78vw,640px)] rounded-sm bg-black"
          />
        )}
      </Dialog>
    </>
  );
}

export default VideoThumb;
