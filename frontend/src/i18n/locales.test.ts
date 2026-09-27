import { describe, expect, it } from 'vitest';

/**
 * Every locale file in the project, as `{ '<lang>/<Namespace>': contents }`. Eager so the test sees the real files
 * rather than a promise per file.
 */
const FILES = import.meta.glob('../locales/*/*.json', { eager: true }) as Record<string, { default: object }>;

const LANGS = ['de', 'en', 'es', 'fr', 'id', 'ja', 'ko', 'th', 'vi', 'zh'] as const;

/** Plural categories a language actually asks i18next for. Vietnamese and Japanese only ever want `other`. */
const PLURALS = Object.fromEntries(
  LANGS.map((l) => [l, new Set(new Intl.PluralRules(l).resolvedOptions().pluralCategories)]),
) as Record<string, Set<string>>;

const parse = (path: string) => {
  const [, lang, file] = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)!;
  return { lang, ns: file };
};

/** Dotted path → `'leaf'` or `'object'`, so a key that is a string in one language and an object in another shows up. */
const shapes = (o: object, prefix = ''): Record<string, 'leaf' | 'object'> => {
  const out: Record<string, 'leaf' | 'object'> = {};
  for (const [k, v] of Object.entries(o)) {
    const path = `${prefix}${k}`;
    if (v !== null && typeof v === 'object') {
      out[path] = 'object';
      Object.assign(out, shapes(v as object, `${path}.`));
    } else {
      out[path] = 'leaf';
    }
  }
  return out;
};

/**
 * A key like `orders_one` belongs only to languages whose plural rules have a `one` category; Vietnamese leaving it out
 * is correct, not a gap.
 */
const wanted = (lang: string) => (key: string) => {
  const suffix = /_(zero|one|two|few|many|other)$/.exec(key)?.[1];
  return suffix === undefined || PLURALS[lang].has(suffix);
};

const byNamespace = new Map<string, Map<string, object>>();
for (const [path, mod] of Object.entries(FILES)) {
  const { lang, ns } = parse(path);
  if (!byNamespace.has(ns)) byNamespace.set(ns, new Map());
  byNamespace.get(ns)!.set(lang, mod.default);
}

describe('Locale files stay in step across all ten languages', () => {
  it('ships every namespace in every language', () => {
    for (const [ns, langs] of byNamespace) {
      expect([...langs.keys()].sort(), ns).toEqual([...LANGS].sort());
    }
  });

  it('gives every language the same keys as English, allowing for plural rules', () => {
    for (const [ns, langs] of byNamespace) {
      const en = Object.keys(shapes(langs.get('en')!));
      for (const lang of LANGS) {
        if (lang === 'en') continue;
        // A missing key falls back to English, so a reader of that language is shown a language they did not pick.
        const expected = en.filter(wanted(lang)).sort();
        const actual = Object.keys(shapes(langs.get(lang)!))
          .filter(wanted(lang))
          .sort();
        expect(actual, `${ns} (${lang})`).toEqual(expected);
      }
    }
  });

  it('keeps every key the same shape as English, so t() never returns an object', () => {
    for (const [ns, langs] of byNamespace) {
      const en = shapes(langs.get('en')!);
      for (const lang of LANGS) {
        if (lang === 'en') continue;
        const mine = shapes(langs.get(lang)!);
        for (const [key, kind] of Object.entries(en)) {
          if (!wanted(lang)(key) || mine[key] === undefined) continue;
          // t('x') on an object prints "key 'x' returned an object instead of string." — in English, to a
          // reader who chose another language.
          expect(mine[key], `${ns}.${key} (${lang})`).toBe(kind);
        }
      }
    }
  });
});
