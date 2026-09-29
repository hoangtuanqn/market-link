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
  fill?: boolean;
  center?: boolean;
  className?: string;
};

export function DataState({ variant = 'empty', title, text, action, fill, center, className }: DataStateProps) {
  const error = variant === 'error';
  const isCentered = fill || center;
  return (
    <div
      role={error ? 'alert' : undefined}
      className={Helper.cn(
        'flex flex-col gap-2 rounded-md p-6',
        fill && 'min-h-80 w-full flex-1',
        !fill && !className?.includes('max-w-') && !className?.includes('w-') && 'max-w-105 min-w-65 flex-1',
        isCentered ? 'items-center justify-center text-center' : 'items-start text-left',
        error ? 'bg-danger-bg border-danger border-[1.5px]' : 'border-line-strong border-[1.5px] border-dashed',
        className,
      )}
    >
      <h3
        className={Helper.cn(
          'm-0 text-[17px] leading-tight font-bold',
          isCentered && 'text-center',
          error ? 'text-danger' : 'font-hand text-[23px] leading-[1.15] font-normal',
        )}
      >
        {title}
      </h3>
      <p
        className={Helper.cn('m-0 text-[14px]', isCentered && 'text-center', error ? 'text-danger' : 'text-ink-muted')}
      >
        {text}
      </p>
      {action}
    </div>
  );
}

type LoadErrorProps = {
  noun: string;
  alt?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

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
          components={{ alt: <Slot node={alt} />, a: <Link to="/feedback" /> }}
        />
      </p>
    </div>
  );
}
