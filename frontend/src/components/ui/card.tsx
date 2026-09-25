import type { FormHTMLAttributes, HTMLAttributes } from 'react';
import Helper from '@/utils/helper';

/** `as="form"` also takes the form attributes, so a panel that is a form needs no wrapper element. */
type CardProps = HTMLAttributes<HTMLElement> &
  Pick<FormHTMLAttributes<HTMLFormElement>, 'noValidate' | 'action' | 'method' | 'autoComplete'> & {
    as?: 'article' | 'div' | 'li' | 'form' | 'section';
  };

/** Paper tag: raised surface, strong line border, card shadow. */
export function Card({ as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={Helper.cn('border-line-strong bg-surface-raised shadow-tag rounded-md border-[1.5px]', className)}
      {...rest}
    />
  );
}
