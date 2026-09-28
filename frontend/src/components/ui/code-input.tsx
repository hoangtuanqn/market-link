import { useState, type ChangeEvent, type Ref } from 'react';
import Helper from '@/utils/helper';

type CodeInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once, when the last digit goes in. */
  onComplete?: (code: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  ref?: Ref<HTMLInputElement>;
};

/**
 * One-time code entry (design system `CodeInput`, FR-009). One real input — so paste, the browser's one-time-code
 * autofill and screen readers behave as usual — drawn as one box per digit. No maxLength on purpose: a pasted "123 456"
 * is 7 characters and the browser would cut it before the spaces are stripped.
 */
export function CodeInput({
  id,
  label,
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  describedBy,
  ref,
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && value.length < length) onComplete?.(digits);
  };

  const active = Math.min(value.length, length - 1);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
      </label>
      <div className="relative w-fit">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="absolute inset-0 z-1 size-full cursor-text text-[16px] opacity-0 disabled:cursor-not-allowed"
        />
        <div aria-hidden="true" className="flex gap-2">
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={Helper.cn(
                'grid h-14 w-11 place-items-center rounded-sm border-[1.5px] font-mono text-[28px] sm:w-12',
                disabled ? 'bg-surface-sunken text-ink-muted' : 'bg-surface-raised text-ink',
                invalid ? 'border-danger' : 'border-line-strong',
                focused && !disabled && i === active && 'outline-focus outline-2 outline-offset-1',
              )}
            >
              {value[i] ?? ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
