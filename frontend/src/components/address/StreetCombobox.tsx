import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import GeoApi from '@/api-requests/geo.requests';
import Helper from '@/utils/helper';

type StreetComboboxProps = {
  id: string;
  label: string;
  provinceCode?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  containerClassName?: string;
};

const DEBOUNCE_MS = 200;

const fold = (s: string) => s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').trim();

type Option = { value: string; label: string };

export default function StreetCombobox({
  id,
  label,
  provinceCode,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  containerClassName,
}: StreetComboboxProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ for: string; names: string[] }>({ for: '', names: [] });
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (!provinceCode || !text) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      GeoApi.streets(provinceCode, text)
        .then((names) => {
          if (ticket === latest.current) setSuggestions({ for: text, names });
        })
        .catch(() => {
          if (ticket === latest.current) setSuggestions({ for: text, names: [] });
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, provinceCode]);

  const typed = value.trim();
  const names = suggestions.for === query.trim() && provinceCode ? suggestions.names : [];
  const exact = names.some((n) => fold(n) === fold(typed));
  const options: Option[] = [
    ...names.map((n) => ({ value: n, label: n })),
    ...(typed && !exact && names.length ? [{ value: typed, label: t('address.useTyped', { text: typed }) }] : []),
  ];
  const expanded = open && options.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  const pick = (option: Option) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === 'Enter' && expanded && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape' && expanded) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={Helper.cn('flex min-w-0 flex-col gap-1.5', containerClassName)}>
      <label htmlFor={id} className="text-small text-ink font-bold">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          disabled={disabled}
          placeholder={t('address.streetPlaceholder')}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            const match = names.find((n) => fold(n) === fold(typed));
            if (match && match !== value) onChange(match);
            setOpen(false);
            setActive(-1);
          }}
          className={Helper.cn(
            'text-body text-ink placeholder:text-ink-muted bg-surface-raised focus-visible:border-focus focus-visible:outline-focus min-h-11 w-full rounded-sm border-[1.5px] px-3 focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
          )}
        />
        {expanded && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t('address.suggestions')}
            className="bg-surface-raised text-ink shadow-pop border-line-strong absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border p-1"
          >
            {options.map((option, i) => (
              <li
                key={`${option.value}-${i}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setActive(i)}
                className={Helper.cn(
                  'text-body cursor-pointer rounded-sm px-3 py-2',
                  i === active && 'bg-surface-sunken',
                  i === names.length && 'text-ink-muted border-line mt-1 border-t',
                )}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
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
