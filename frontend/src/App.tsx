/**
 * Placeholder page wired to the MarketLink design system. Replace it with the real router/pages. Tokens and ml-*
 * classes: docs/design-system/README.md
 */
export default function App() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="ml-header">
        <div className="ml-header-in">
          <span className="ml-logo">
            <img src="/brand/marketlink-mark-light.svg" alt="" width={30} height={30} />
            <span className="ml-logo-word">MarketLink</span>
          </span>
        </div>
        <div className="ml-header-twine" aria-hidden="true" />
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-12 md:px-6">
        <p className="font-hand text-hand text-ink-muted">Saturday 26/09 · 06:00–11:00</p>
        <h1 className="font-hand text-display text-ink">Pre-order from the farmers market</h1>
        <p className="text-body-lg text-ink max-w-[620px]">
          Pick up at the stall and pay the Farmer directly. The design system is loaded: start building pages from the
          reference screens in <code>docs/design-system/reference/gallery.html</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ml-btn ml-btn-primary">
            Browse markets
          </button>
          <button type="button" className="ml-btn ml-btn-secondary">
            Sell at MarketLink
          </button>
        </div>
      </main>
    </div>
  );
}
