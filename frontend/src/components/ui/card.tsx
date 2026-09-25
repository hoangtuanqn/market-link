import type { HTMLAttributes } from 'react';
import Helper from '@/utils/helper';

type CardProps = HTMLAttributes<HTMLElement> & { as?: 'article' | 'div' | 'li' | 'form' | 'nav' | 'section' };

/** Paper tag: raised surface, strong line border, card shadow. */
export function Card({ as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={Helper.cn('border-line-strong bg-surface-raised shadow-tag rounded-md border-[1.5px]', className)}
      {...rest}
    />
  );
}
