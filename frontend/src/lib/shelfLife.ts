import type { ShelfLifeGroupDto } from '@/api-requests/shelf-life.requests';
import { foldText } from '@/lib/format';

export const maxShelfLifeDays = (suggested: number): number => suggested * 2;

export const extendedBy = (days: number, suggested?: number | null): number =>
  suggested == null ? 0 : Math.max(0, days - suggested);

const words = (text: string) =>
  ` ${foldText(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

export function matchGuideGroup(productName: string, groups: ShelfLifeGroupDto[]): ShelfLifeGroupDto | undefined {
  const name = words(productName);
  if (!name.trim()) return undefined;
  let best: { group: ShelfLifeGroupDto; length: number } | undefined;
  for (const group of groups) {
    for (const raw of group.examples.split(',')) {
      const example = words(raw).trim();
      const found = example && [example, `${example}s`, `${example}es`].some((w) => name.includes(` ${w} `));
      if (found && (!best || example.length > best.length)) {
        best = { group, length: example.length };
      }
    }
  }
  return best?.group;
}
