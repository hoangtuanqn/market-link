import type { ShelfLifeGroupDto } from '@/api-requests/shelf-life.requests';
import { foldText } from '@/lib/format';

/** FR-121: the longest a Farmer may set — twice the suggestion, the same rule as the server. */
export const maxShelfLifeDays = (suggested: number): number => suggested * 2;

/** Days above the suggestion; 0 when there is none or the Farmer went shorter. */
export const extendedBy = (days: number, suggested?: number | null): number =>
  suggested == null ? 0 : Math.max(0, days - suggested);

/** " rau muong cu chi ": folded, punctuation turned into spaces, padded so whole words can be found. */
const words = (text: string) =>
  ` ${foldText(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

/**
 * FR-120: the storage group whose example words appear in the product name, as whole words, ignoring case and accents.
 * An English plural of an example counts too ("Carrots", "Sweet potatoes"): English names of produce are usually
 * plural, and a Vietnamese syllable never ends in "s", so no Vietnamese name gains a false match. The longest matching
 * example wins ("cà chua" beats "cà"); undefined when nothing matches.
 */
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
