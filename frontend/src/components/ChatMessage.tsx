import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Chip } from '@/components/ui/chip';
import Helper from '@/utils/helper';

/** A link back to the order a message refers to. Laid out after `.pt-msg-ref` in
 *  docs/prototype/prototype.css, which is prototype scaffolding rather than the design system. */
export const MessageOrderRef = ({
  href,
  title,
  detail,
  onDark,
}: {
  href: string;
  title: string;
  detail: string;
  onDark?: boolean;
}) => (
  <Link
    to={href}
    className={Helper.cn(
      'mt-1.5 block rounded-sm p-3 text-[13px] no-underline',
      onDark ? 'bg-brand-strong text-on-brand' : 'bg-surface-sunken text-ink',
    )}
  >
    <b className="block text-[14px]">{title}</b>
    {detail}
  </Link>
);

type ChatMessageProps = {
  from: 'user' | 'bot';
  who?: string;
  time?: string;
  intent?: string;
  children: ReactNode;
  suggestions?: string[];
  onSuggestion?: (s: string) => void;
};

/** One chat bubble, left for the stall/assistant, right for the customer (design system `.ml-chat`/`.ml-msg`). */
const ChatMessage = ({ from, who, time, intent, children, suggestions, onSuggestion }: ChatMessageProps) => {
  const bot = from !== 'user';
  return (
    <div
      className={Helper.cn('flex max-w-[85%] flex-col gap-1', bot ? 'items-start self-start' : 'items-end self-end')}
    >
      <div
        className={Helper.cn(
          'rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug',
          bot
            ? 'bg-surface-raised border-line-strong rounded-bl-sm border-[1.5px]'
            : 'bg-brand text-on-brand rounded-br-sm',
        )}
      >
        {children}
      </div>
      <div className="text-ink-muted flex flex-wrap items-center gap-2 text-[12px]">
        <span>{who ?? (bot ? 'MarketLink assistant' : 'You')}</span>
        {time && <span>· {time}</span>}
        {intent && <span className="bg-info-bg text-info-ink rounded-full px-2 font-bold">Intent: {intent}</span>}
      </div>
      {suggestions && (
        <div className="mt-0.5 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Chip key={s} onClick={() => onSuggestion?.(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
