import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';

export type LegalBlock =
  | { p: string }
  | { facts: { title?: string; items: [term: string, text: string][] } }
  | { nots: { title: string; items: [head: string, text: string][] } };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

type LegalPageProps = {
  title: string;
  lead: string;
  meta: string;
  onThisPage: string;
  seeAlso: ReactNode;
  sections: LegalSection[];
  cta: { title: string; text: string; links: [label: string, to: string][] };
};

const LegalPage = ({ title, lead, meta, onThisPage, seeAlso, sections, cta }: LegalPageProps) => (
  <div className="flex flex-col gap-8">
    <div className="flex max-w-155 flex-col gap-2">
      <h1 className="font-hand text-[44px] leading-[1.08] md:text-[54px]">{title}</h1>
      <p className="text-body-lg">{lead}</p>
      <p className="text-small text-ink-muted">{meta}</p>
    </div>

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav
        aria-label={onThisPage}
        className="border-line-strong bg-surface-raised flex flex-col gap-2 rounded-xl border p-4 shadow-xs lg:sticky lg:top-[calc(var(--size-header)+var(--space-4))]"
      >
        <p className="text-overline text-ink-muted uppercase">{onThisPage}</p>
        {sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="text-small text-brand underline underline-offset-2">
            {i + 1}. {s.title}
          </a>
        ))}
        <p className="text-caption text-ink-muted">{seeAlso}</p>
      </nav>

      <div className="flex flex-col gap-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-h2">
              {i + 1}. {s.title}
            </h2>
            {s.blocks.map((b, j) =>
              'p' in b ? (
                <p key={j} className="text-body max-w-155">
                  {b.p}
                </p>
              ) : 'facts' in b ? (
                <div
                  key={j}
                  className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-xl border p-6 shadow-xs"
                >
                  {b.facts.title && <h3 className="text-h3">{b.facts.title}</h3>}
                  <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[15px] sm:grid-cols-[auto_1fr]">
                    {b.facts.items.map(([term, text]) => (
                      <div key={term} className="contents">
                        <dt className="text-ink-muted max-sm:font-bold">{term}</dt>
                        <dd className="m-0 max-sm:mb-2">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <div
                  key={j}
                  className="border-line-strong bg-surface-raised flex flex-col gap-3 rounded-xl border p-6 shadow-xs"
                >
                  <h3 className="text-h3">{b.nots.title}</h3>
                  <ul className="m-0 flex flex-col gap-3 p-0">
                    {b.nots.items.map(([head, text]) => (
                      <li
                        key={head}
                        className="border-line-strong list-none border-b border-dotted pb-3 text-[15px] leading-5.5 last:border-b-0 last:pb-0"
                      >
                        <b className="block">{head}</b> {text}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </section>
        ))}
      </div>
    </div>

    <section className="border-line-strong bg-surface-raised flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6 shadow-xs">
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{cta.title}</h2>
        <p className="text-small text-ink-muted">{cta.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cta.links.map(([label, to]) => (
          <ButtonLink key={to} to={to} variant="secondary">
            {label}
          </ButtonLink>
        ))}
      </div>
    </section>
  </div>
);

export default LegalPage;
