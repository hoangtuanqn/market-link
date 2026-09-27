import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

const SCOPES = ['all', 'market', 'farmer', 'product'] as const;

const SearchBar = () => {
  const { t } = useTranslation('Home');
  const navigate = useNavigate();
  const [scope, setScope] = useState('all');
  const [q, setQ] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ scope, q: q.trim() })}`);
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-160 items-stretch overflow-hidden rounded-md border-[1.5px] shadow-xs focus-within:outline-2 focus-within:outline-offset-1"
    >
      <label className="sr-only" htmlFor="s-scope">
        {t('search.scope')}
      </label>
      <select
        id="s-scope"
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        className="border-line bg-surface-sunken text-small text-ink min-h-12 cursor-pointer border-r-[1.5px] px-3.5 font-bold focus:outline-none"
      >
        {SCOPES.map((s) => (
          <option key={s} value={s}>
            {t(`search.scopes.${s}`)}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="s-q">
        {t('search.keyword')}
      </label>
      <input
        id="s-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('search.placeholder')}
        className="text-body text-ink placeholder:text-ink-muted min-h-12 min-w-0 flex-1 bg-transparent px-4 focus:outline-none"
      />

      <Button type="submit" className="flex items-center gap-2 rounded-none px-5">
        <SearchIcon size={16} />
        <span>{t('search.submit')}</span>
      </Button>
    </form>
  );
};

export default SearchBar;
