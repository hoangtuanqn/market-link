const pageBtn =
  'text-ink hover:bg-surface-sunken aria-[current=page]:bg-brand aria-[current=page]:text-on-brand min-h-10 min-w-10 cursor-pointer rounded-sm bg-transparent px-2.5 font-bold disabled:cursor-not-allowed disabled:text-line-strong';

/** Numbered page list with an ellipsis for long runs (design system `.ml-pages`). */
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  const list: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
    else if (list[list.length - 1] !== '…') list.push('…');
  }

  return (
    <nav aria-label="Pagination">
      <ul className="m-0 flex items-center gap-1 p-0">
        <li>
          <button
            type="button"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => onChange(page - 1)}
            className={pageBtn}
          >
            ‹
          </button>
        </li>
        {list.map((n, i) =>
          n === '…' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="text-ink-muted px-1.5">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                onClick={() => onChange(n)}
                className={pageBtn}
              >
                {n}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            disabled={page >= pages}
            aria-label="Next page"
            onClick={() => onChange(page + 1)}
            className={pageBtn}
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  );
}
