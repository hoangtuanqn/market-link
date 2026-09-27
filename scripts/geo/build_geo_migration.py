#!/usr/bin/env python3
"""Build the Flyway migration that loads the address master data (FR-001, FR-073).

Inputs (download them first, see scripts/geo/README.md):
  --units      mysql_ImportData_vn_units.sql from thanglequoc/vietnamese-provinces-database (MIT)
  --streets    one street name per line, exported from OpenStreetMap through Overpass (ODbL)
  --countries  "CODE<TAB>English name" per line (java.util.Locale.getISOCountries())
  --out        the migration file to write

The dataset SQL is parsed, never executed. Street names are cleaned and folded the same way as
TextNormalizer.normalize on the backend, so a search typed without diacritics finds them.
"""

import argparse
import csv
import re
import unicodedata
from collections import Counter

BATCH = 500
STREET_PROVINCE = '79'  # Ho Chi Minh City, the only province with a street list for now

# Alleys, bridges, roundabouts, stations and the like are not streets a house number sits on. "Bến" alone
# stays: "Bến Vân Đồn" and "Bến Chương Dương" are streets named after the wharves along them.
NOT_A_STREET = re.compile(
    r'^(hẻm|hẽm|hèm|hem|ngõ|ngách|kiệt|kiet|lối|lô|khu|chung cư|cầu|nút giao|vòng xoay|'
    r'bến (xe|phà|đò|tàu|cảng|thuyền)|đường vào|đường dẫn|đường nội bộ|ramp|nhánh)\b'
)


def fold(text):
    """Same result as TextNormalizer.normalize: lower case, no diacritics, đ -> d, [a-z0-9 ] only."""
    lower = text.lower().replace('đ', 'd')
    no_marks = ''.join(c for c in unicodedata.normalize('NFD', lower) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', no_marks).strip()


def parse_tuples(src, table):
    """Rows of every `INSERT INTO <table>(cols) VALUES (...),(...);` statement, as dicts."""
    rows = []
    pattern = re.compile(r'INSERT INTO %s\(([^)]*)\) VALUES\s*(.*?);\s*$' % table, re.S | re.M)
    for match in pattern.finditer(src):
        cols = [c.strip() for c in match.group(1).split(',')]
        body = match.group(2)
        i, n = 0, len(body)
        while i < n:
            if body[i] != '(':
                i += 1
                continue
            i += 1
            values, current = [], None
            while True:
                c = body[i]
                if c == "'":
                    j, chars = i + 1, []
                    while True:
                        if body[j] == "'" and j + 1 < n and body[j + 1] == "'":
                            chars.append("'")
                            j += 2
                            continue
                        if body[j] == "'":
                            break
                        chars.append(body[j])
                        j += 1
                    current, i = ''.join(chars), j + 1
                elif c in ',)':
                    values.append(current)
                    current = None
                    i += 1
                    if c == ')':
                        break
                elif c.isspace():
                    i += 1
                else:
                    j = i
                    while body[j] not in ',)':
                        j += 1
                    token = body[i:j].strip()
                    current, i = (None if token.upper() == 'NULL' else token), j
            rows.append(dict(zip(cols, values)))
    return rows


def clean_street(raw):
    name = unicodedata.normalize('NFC', re.sub(r'\s+', ' ', raw).strip())
    if len(name) < 2 or len(name) > 100 or '/' in name or ';' in name:
        return None
    if NOT_A_STREET.match(name.lower()) or re.fullmatch(r'[\d\s\-]+', name):
        return None
    bare_number = re.match(r'^(số|Số|SỐ)\s*(\S.*)$', name)
    if bare_number:
        # "số 4-IV" is the numbered street "Đường số 4-IV" with its prefix left out
        return 'Đường số ' + bare_number.group(2)
    prefixed = re.match(r'^(đường|Đường|ĐƯỜNG|duong|Duong)\s+(.*)$', name)
    if not prefixed and name[:1].islower():
        # A name typed in lower case on OpenStreetMap ("bình nhâm 42")
        return name[:1].upper() + name[1:]
    if prefixed:
        rest = prefixed.group(2)
        if re.match(r'^(số|Số|SỐ|so|So)\s*\S', rest):
            # "Đường Số 12", "đường số P8": one spelling for the numbered streets
            return 'Đường số ' + re.sub(r'^(số|Số|SỐ|so|So)\s*', '', rest)
        if rest[:1].islower() or re.match(r'^[A-ZĐ]\d', rest) or re.match(r'^\d', rest) or ' ' not in rest:
            # "Đường tỉnh 749A", "Đường liên ấp 2-3", "Đường D1": the prefix is part of the name
            return 'Đường ' + rest
        # "Đường Lê Lợi" is written "Lê Lợi" on every address
        return rest
    return name


def read_street_names(path):
    """Overpass writes CSV: a name with a comma arrives quoted ('"Đường số 5, KP.7"')."""
    with open(path, encoding='utf-8', newline='') as f:
        return [row[0] for row in csv.reader(f) if row and row[0].strip()]


def dedupe_key(name):
    """Spellings of one street fold to the same key: "Bình Giã"/"Bĩnh Giã", "D1"/"Đường D1"."""
    return re.sub(r'^duong ', '', fold(name))


def streets_from(names):
    counts = Counter(v for v in (clean_street(n) for n in names if n.strip()) if v)
    best = {}
    for name, _ in counts.most_common():
        # The most frequent spelling wins; the rest are mostly typos in OpenStreetMap
        best.setdefault(dedupe_key(name), name)
    return sorted(best.values(), key=lambda s: (fold(s), s))


def sql(value):
    return 'NULL' if value is None else "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def batched_insert(table, cols, rows):
    out = []
    for start in range(0, len(rows), BATCH):
        chunk = rows[start:start + BATCH]
        values = ',\n'.join('(' + ', '.join(sql(v) for v in row) + ')' for row in chunk)
        out.append('INSERT INTO %s (%s) VALUES\n%s;\n' % (table, ', '.join(cols), values))
    return '\n'.join(out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--units', required=True)
    parser.add_argument('--streets', required=True)
    parser.add_argument('--countries', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    units = open(args.units, encoding='utf-8').read()
    version = re.search(r"vn_provinces_metadata\([^)]*\) VALUES\('([^']*)','([^']*)'", units)
    provinces = sorted(parse_tuples(units, 'provinces'), key=lambda p: p['code'])
    wards = sorted(parse_tuples(units, 'wards'), key=lambda w: w['code'])
    countries = [l.rstrip('\n').split('\t') for l in open(args.countries, encoding='utf-8') if l.strip()]
    streets = streets_from(read_street_names(args.streets))
    hcm_wards = sum(1 for w in wards if w['province_code'] == STREET_PROVINCE)

    header = f"""-- FR-001, FR-073: address master data. Vietnam has two levels since 01/07/2025
-- (province -> ward/commune, no district), so there is no districts table.
--
-- Generated by scripts/geo/build_geo_migration.py; do not edit by hand. A later decree means a
-- NEW migration (R-03), never an edit of this one.
--
-- Sources:
--   countries  ISO 3166-1 alpha-2 from java.util.Locale.getISOCountries()          {len(countries)} rows
--   provinces  thanglequoc/vietnamese-provinces-database {version.group(1)} (MIT), data from the
--              General Statistics Office of Vietnam, decree {version.group(2)}      {len(provinces)} rows
--   wards      same dataset                                                          {len(wards)} rows ({hcm_wards} in Ho Chi Minh City)
--   streets    (c) OpenStreetMap contributors, ODbL, via Overpass on 2026-09-27;
--              Ho Chi Minh City only, alleys/bridges/roundabouts removed            {len(streets)} rows
--
-- streets.name_search is the name folded like TextNormalizer.normalize (lower case, no
-- diacritics, "đ" -> "d") so "le loi" finds "Lê Lợi".

"""

    ddl = """CREATE TABLE countries (
    code    CHAR(2)      NOT NULL PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL
);

CREATE TABLE provinces (
    code         VARCHAR(5)   NOT NULL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    full_name    VARCHAR(120) NOT NULL,
    name_en      VARCHAR(100) NULL,
    full_name_en VARCHAR(120) NULL
);

CREATE TABLE wards (
    code          VARCHAR(5)   NOT NULL PRIMARY KEY,
    province_code VARCHAR(5)   NOT NULL,
    name          VARCHAR(100) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    name_en       VARCHAR(100) NULL,
    full_name_en  VARCHAR(120) NULL,
    -- Lets users/markets point at (province, ward) with one composite foreign key, so a ward can
    -- never be stored under a province it does not belong to.
    UNIQUE KEY uq_wards_province_code (province_code, code),
    CONSTRAINT fk_wards_province FOREIGN KEY (province_code) REFERENCES provinces (code)
);

-- Suggestions only: an address may name a street that is not in this table.
CREATE TABLE streets (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    province_code VARCHAR(5)   NOT NULL,
    -- Binary collation: the server default (utf8mb4_unicode_ci) ignores diacritics, which would
    -- make "Lê Lai" and "Lê Lài" collide on the unique key below.
    name          VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    name_search   VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_streets_province_name (province_code, name),
    INDEX idx_streets_search (province_code, name_search),
    CONSTRAINT fk_streets_province FOREIGN KEY (province_code) REFERENCES provinces (code)
);

"""

    body = [
        batched_insert('countries', ['code', 'name_en'], [(c, n) for c, n in countries]),
        batched_insert(
            'provinces',
            ['code', 'name', 'full_name', 'name_en', 'full_name_en'],
            [(p['code'], p['name'], p['full_name'], p['name_en'], p['full_name_en']) for p in provinces],
        ),
        batched_insert(
            'wards',
            ['code', 'province_code', 'name', 'full_name', 'name_en', 'full_name_en'],
            [(w['code'], w['province_code'], w['name'], w['full_name'], w['name_en'], w['full_name_en'])
             for w in wards],
        ),
        batched_insert(
            'streets',
            ['province_code', 'name', 'name_search'],
            [(STREET_PROVINCE, s, fold(s)) for s in streets],
        ),
    ]
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(header + ddl + '\n'.join(body))
    print(f'countries={len(countries)} provinces={len(provinces)} wards={len(wards)} '
          f'hcm_wards={hcm_wards} streets={len(streets)} -> {args.out}')


if __name__ == '__main__':
    main()
