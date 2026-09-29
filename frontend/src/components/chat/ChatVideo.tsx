import { type MouseEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import { PlayIcon } from '@/components/icons';

type Props = { attachmentId: number; label: string };

type Link = { src: string; expiresAt: number };

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | ({ phase: 'playing' } & Link)
  | ({ phase: 'unplayable' } & Link)
  | { phase: 'unavailable' };

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

async function freshLink(attachmentId: number): Promise<Link> {
  const { data } = await ConversationApi.streamUrl(attachmentId);
  return { src: `${API_ORIGIN}${data.url}`, expiresAt: Date.parse(data.expiresAt) };
}

export default function ChatVideo({ attachmentId, label }: Props) {
  const { t } = useTranslation('common');
  const [state, setState] = useState<State>({ phase: 'idle' });
  const video = useRef<HTMLVideoElement>(null);
  const renewed = useRef(false);
  const resumeAt = useRef(0);

  const play = async () => {
    setState({ phase: 'loading' });
    try {
      setState({ phase: 'playing', ...(await freshLink(attachmentId)) });
    } catch {
      setState({ phase: 'unavailable' });
    }
  };

  const onError = async () => {
    if (state.phase !== 'playing') return;
    if (Date.now() >= state.expiresAt && !renewed.current) {
      renewed.current = true;
      resumeAt.current = video.current?.currentTime ?? 0;
      try {
        setState({ phase: 'playing', ...(await freshLink(attachmentId)) });
      } catch {
        setState({ phase: 'unavailable' });
      }
      return;
    }
    setState({ phase: 'unplayable', src: state.src, expiresAt: state.expiresAt });
  };

  const download = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (state.phase !== 'unplayable' || Date.now() < state.expiresAt) return;
    event.preventDefault();
    try {
      const link = await freshLink(attachmentId);
      setState({ phase: 'unplayable', ...link });
      window.location.assign(`${link.src}&download=1`);
    } catch {
      setState({ phase: 'unavailable' });
    }
  };

  if (state.phase === 'unavailable') {
    return (
      <span className="text-small text-ink-muted border-line-strong block rounded-md border p-3">
        {t('chat.videoUnavailable')}
      </span>
    );
  }

  if (state.phase === 'unplayable') {
    return (
      <span className="text-small border-line-strong flex flex-col gap-2 rounded-md border p-3">
        <span className="text-ink-muted">{t('chat.videoCantPlay')}</span>
        <a
          href={`${state.src}&download=1`}
          onClick={(event) => void download(event)}
          className="text-ink font-semibold underline"
        >
          {t('chat.downloadVideo')}
        </a>
      </span>
    );
  }

  return (
    <span className="bg-surface-sunken relative block aspect-video w-[280px] max-w-full overflow-hidden rounded-md">
      {state.phase === 'playing' ? (
        <video
          ref={video}
          key={state.src}
          src={state.src}
          aria-label={label}
          controls
          playsInline
          autoPlay
          preload="metadata"
          onError={() => void onError()}
          onLoadedMetadata={(event) => {
            if (resumeAt.current > 0) {
              event.currentTarget.currentTime = resumeAt.current;
              resumeAt.current = 0;
            }
          }}
          className="size-full object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => void play()}
          disabled={state.phase === 'loading'}
          aria-busy={state.phase === 'loading'}
          aria-label={state.phase === 'loading' ? t('chat.loadingVideo') : t('chat.playVideo')}
          className="group grid size-full cursor-pointer place-items-center"
        >
          <span
            aria-hidden="true"
            className="bg-ink/55 text-on-brand grid size-11 place-items-center rounded-full transition group-hover:scale-110"
          >
            <PlayIcon size={20} />
          </span>
        </button>
      )}
    </span>
  );
}
