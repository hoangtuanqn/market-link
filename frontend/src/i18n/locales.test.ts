import { describe, expect, it } from 'vitest';

const FILES = import.meta.glob('../locales/*/*.json', { eager: true }) as Record<string, { default: object }>;

const LANGS = ['de', 'en', 'es', 'fr', 'id', 'ja', 'ko', 'th', 'vi', 'zh'] as const;

const PLURALS = Object.fromEntries(
  LANGS.map((l) => [l, new Set(new Intl.PluralRules(l).resolvedOptions().pluralCategories)]),
) as Record<string, Set<string>>;

const parse = (path: string) => {
  const [, lang, file] = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)!;
  return { lang, ns: file };
};

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

const wanted = (lang: string) => (key: string) => {
  const suffix = /_(zero|one|two|few|many|other)$/.exec(key)?.[1];
  return suffix === undefined || PLURALS[lang].has(suffix);
};

const variablesByKey = (o: object, prefix = '', out: Record<string, Set<string>> = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const path = `${prefix}${k}`;
    if (v !== null && typeof v === 'object') {
      variablesByKey(v as object, `${path}.`, out);
    } else if (typeof v === 'string') {
      const key = path.replace(/_(zero|one|two|few|many|other)$/, '');
      out[key] ??= new Set();
      for (const m of v.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)) out[key].add(m[1]);
    }
  }
  return out;
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
          expect(mine[key], `${ns}.${key} (${lang})`).toBe(kind);
        }
      }
    }
  });

  it('uses the same {{variables}} as English, so no translation prints a raw placeholder', () => {
    for (const [ns, langs] of byNamespace) {
      const en = variablesByKey(langs.get('en')!);
      for (const lang of LANGS) {
        if (lang === 'en') continue;
        for (const [key, vars] of Object.entries(variablesByKey(langs.get(lang)!))) {
          const expected = en[key];
          if (expected === undefined) continue;
          const strip = (set: Set<string>) => [...set].filter((v) => v !== 'count').sort();
          expect(strip(vars), `${ns}.${key} (${lang})`).toEqual(strip(expected));
        }
      }
    }
  });
});
