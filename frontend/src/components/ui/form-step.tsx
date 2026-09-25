import type { ReactNode } from 'react';

/**
 * One numbered step of a long application form. Laid out after `.pt-steps-form` in docs/prototype/prototype.css, which
 * is prototype scaffolding rather than the design system.
 */
export function FormStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-1 gap-2 md:grid-cols-[36px_minmax(0,1fr)] md:gap-4">
      <span className="bg-brand text-on-brand font-hand grid size-9 place-items-center rounded-full text-[20px]">
        {n}
      </span>
      <div className="flex flex-col gap-3">
        <h2 className="text-h3 mt-1.5">{title}</h2>
        {children}
      </div>
    </li>
  );
}
