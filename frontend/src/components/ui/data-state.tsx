import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AlertIcon } from '@/components/icons';
import Helper from '@/utils/helper';
import { Button } from './button';

type DataStateProps = {
  variant?: 'empty' | 'error';
  title: ReactNode;
  text: string;
  action?: ReactNode;
  className?: string;
};

/** A block's empty or error state (design system `.ml-state`, FR-084). */
export function DataState({ variant = 'empty', title, text, action, className }: DataStateProps) {
  const error = variant === 'error';
  return (
    <div
      role={error ? 'alert' : undefined}
      className={Helper.cn(
        'flex max-w-105 min-w-65 flex-1 flex-col items-start gap-2 rounded-md p-6',
        error ? 'bg-danger-bg border-danger border-[1.5px]' : 'border-line-strong border-[1.5px] border-dashed',
        className,
      )}
    >
      <h3
        className={Helper.cn(
          'm-0 text-[17px] leading-tight font-bold',
          error ? 'text-danger' : 'font-hand text-[23px] leading-[1.15] font-normal',
        )}
      >
        {title}
      </h3>
      <p className={Helper.cn('m-0 text-[14px]', error ? 'text-danger' : 'text-ink-muted')}>{text}</p>
      {action}
    </div>
  );
}

type LoadErrorProps = {
  /** What did not arrive, in the plural: "markets", "products". */
  noun: string;
  /** One more way out, phrased for the screen: "the market map opens on its own page". */
  alt?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

/**
 * One shape for "the list did not load", so every screen says it the same way (FR-084). The red block stays short; the
 * longer guidance sits under it in normal ink, because an error block paints everything inside it danger-red and a
 * paragraph of that is tiring.
 */
/** Puts a ReactNode where a `<alt />` tag sits in a translated sentence (Trans passes it no children). */
const Slot = ({ node }: { node: ReactNode }) => <>{node}</>;

export function LoadError({ noun, alt, onRetry, className }: LoadErrorProps) {
  const { t } = useTranslation();
  return (
    <div className={Helper.cn('flex flex-col gap-4', className)}>
      <DataState
        variant="error"
        className="max-w-none flex-none"
        title={
          <span className="inline-flex items-center gap-2">
            <AlertIcon />
            {t('loadError.title', { noun })}
          </span>
        }
        text={t('loadError.text')}
        action={
          <Button variant="danger" size="sm" onClick={onRetry}>
            {t('actions.tryAgain')}
          </Button>
        }
      />
      <p className="text-small text-ink-muted max-w-155">
        <Trans
          t={t}
          i18nKey={alt ? 'loadError.helpAlt' : 'loadError.help'}
          components={{ alt: <Slot node={alt} />, link: <Link to="/feedback" /> }}
        />
      </p>
    </div>
  );
}
