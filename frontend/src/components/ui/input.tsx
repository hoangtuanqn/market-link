import type { InputHTMLAttributes } from 'react';
import Helper from '@/utils/helper';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={Helper.cn(
        'border-line-strong bg-surface-raised text-body text-ink placeholder:text-ink-muted hover:border-ink-muted focus-visible:border-focus focus-visible:outline-focus disabled:bg-surface-sunken aria-invalid:border-danger box-border min-h-11 w-full rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

/** Label + control + lỗi của field (design system: Field). */
export function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-danger text-[13px] font-bold">
          {error}
        </span>
      )}
    </div>
  );
}
