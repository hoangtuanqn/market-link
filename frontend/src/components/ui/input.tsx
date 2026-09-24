import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import Helper from '@/utils/helper';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Labelled input: required mark, hint or error line, focus ring (design system `.ml-field` + `.ml-input`). */
export function Field({ id, label, required, error, hint, className, ...rest }: FieldProps) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex min-w-55 flex-col gap-1.5">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={Helper.cn(
          'text-body text-ink placeholder:text-ink-muted bg-surface-raised border-line-strong hover:border-ink-muted focus-visible:border-focus focus-visible:outline-focus min-h-11 w-full rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1',
          error && 'border-danger',
          className,
        )}
        {...rest}
      />
      {error ? (
        <span id={`${id}-err`} role="alert" className="text-danger text-[13px] font-bold">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-ink-muted text-[13px]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[] | { value: string; label: string }[];
};

/** Labelled select (design system `.ml-field` + `.ml-input`). */
export function SelectField({ id, label, options, className, ...rest }: SelectFieldProps) {
  return (
    <div className="flex min-w-55 flex-col gap-1.5">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
      </label>
      <select
        id={id}
        className={Helper.cn(
          'text-body text-ink bg-surface-raised border-line-strong hover:border-ink-muted focus-visible:border-focus focus-visible:outline-focus min-h-11 w-full rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1',
          className,
        )}
        {...rest}
      >
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
