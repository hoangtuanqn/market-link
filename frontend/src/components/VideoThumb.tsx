import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import Helper from '@/utils/helper';

type VideoThumbProps = {
  url: string;
  poster?: string | null;
  className?: string;
  big?: boolean;
};

const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

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
