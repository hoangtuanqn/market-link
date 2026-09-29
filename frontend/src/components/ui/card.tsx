import type { FormHTMLAttributes, HTMLAttributes } from 'react';
import Helper from '@/utils/helper';

type CardProps = HTMLAttributes<HTMLElement> &
  Pick<FormHTMLAttributes<HTMLFormElement>, 'noValidate' | 'action' | 'method' | 'autoComplete'> & {
    as?: 'article' | 'aside' | 'div' | 'li' | 'form' | 'nav' | 'section';
  };

export function Card({ as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={Helper.cn('border-line-strong bg-surface-raised shadow-tag rounded-md border-[1.5px]', className)}
      {...rest}
    />
  );
}
