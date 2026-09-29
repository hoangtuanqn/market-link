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

/** The signed link is relative to the API origin; the video tag needs it absolute. */
async function freshLink(attachmentId: number): Promise<Link> {
  const { data } = await ConversationApi.streamUrl(attachmentId);
  return { src: `${API_ORIGIN}${data.url}`, expiresAt: Date.parse(data.expiresAt) };
}

/**
 * A video in the chat (FR-115, spec 2026-09-28-chat-media-design §6). A `<video src>` cannot send the Authorization
 * header, so pressing play asks for a short-lived signed link and only then mounts the player — nothing is downloaded
 * while the thread scrolls by, and the server answers Range requests so the reader can seek.
 *
 * Videos are stored as uploaded, never converted, so some files (HEVC from an iPhone, for one) will not decode in every
 * browser: that case offers a download instead of a broken player.
 */
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

  /**
   * A link that ran out mid-video is renewed once and picks up where it stopped. Any other error means this browser
   * cannot decode the file.
   */
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

  /** The download goes through the same signed link, so an expired one is swapped for a fresh one first. */
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
    // 16:9 is reserved before anything loads, so the thread does not jump when the player appears
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
