import { useTranslation } from 'react-i18next';
import { useState, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/icons';
import Helper from '@/utils/helper';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** A label for screen readers only — a search box with a placeholder is already clear enough to sighted people. */
  hideLabel?: boolean;
};

/**
 * Labelled input: required mark, hint or error line, focus ring (design system `.ml-field` + `.ml-input`).
 * type="password" gets an extra eye button to show / hide the password.
 */
export function Field({ id, label, required, error, hint, hideLabel, className, type, disabled, ...rest }: FieldProps) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const isPassword = type === 'password';
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const input = (
    <input
      id={id}
      type={isPassword && showPassword ? 'text' : type}
      required={required}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={describedBy}
      className={Helper.cn(
        'text-body text-ink placeholder:text-ink-muted bg-surface-raised focus-visible:border-focus focus-visible:outline-focus min-h-11 w-full rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1',
        isPassword && 'pr-11',
        // Exclusive, not layered: Helper.cn only joins strings, so a resting border left in place would win over the
        // error border on whichever utility Tailwind happens to emit last.
        error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
        className,
      )}
      {...rest}
    />
  );

  return (
    <div className="flex min-w-55 flex-col gap-1.5">
      <label htmlFor={id} className={Helper.cn('text-small text-ink font-bold', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        )}
      </label>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={disabled}
            aria-controls={id}
            aria-pressed={showPassword}
            aria-label={showPassword ? t('password.hide') : t('password.show')}
            title={showPassword ? t('password.hide') : t('password.show')}
            className="text-ink-muted hover:text-ink focus-visible:outline-focus absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-sm bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4.5"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        input
      )}
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
  /** Hide the label visually when it's already shown by a surrounding row (kept for screen readers). */
  hideLabel?: boolean;
};

/** Labelled select (design system `.ml-field` + `.ml-input`). */
export function SelectField({ id, label, options, hideLabel, className, ...rest }: SelectFieldProps) {
  return (
    <div className="flex min-w-55 flex-col gap-1.5">
      <label htmlFor={id} className={Helper.cn('text-small text-ink font-bold', hideLabel && 'sr-only')}>
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
