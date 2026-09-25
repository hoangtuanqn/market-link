import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

const SCOPES = [
  { value: 'all', label: 'Everything' },
  { value: 'market', label: 'Markets' },
  { value: 'farmer', label: 'Stalls' },
  { value: 'product', label: 'Products' },
];

const SearchBar = () => {
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
      className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-160 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1"
    >
      <label className="sr-only" htmlFor="s-scope">
        Search in
      </label>
      <select
        id="s-scope"
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        className="border-line-strong bg-surface-sunken text-small text-ink min-h-11 border-r-[1.5px] px-3 font-bold focus:outline-none"
      >
        {SCOPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="s-q">
        Keyword
      </label>
      <input
        id="s-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Water spinach, Cô Tư Garden, Thảo Điền market…"
        className="text-body text-ink placeholder:text-ink-muted min-h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
      />

      <Button type="submit" className="rounded-none">
        Search
      </Button>
    </form>
  );
};

export default SearchBar;
