# Address master data (FR-001, FR-073)

`build_geo_migration.py` builds `backend/src/main/resources/db/migration/V20260927001__create_geo_tables.sql`:
countries, Vietnam's 34 provinces and 3,321 wards (two levels since 01/07/2025), and a street list for
Ho Chi Minh City used for suggestions only.

The migration is already committed. Re-run the script only when a new decree changes the units or
the street list needs a refresh. The output then goes into a **new** migration: never edit one that
has been merged (R-03, Flyway checks its checksum).

## Inputs

| File | Where from | Licence |
|---|---|---|
| `mysql_ImportData_vn_units.sql` | `mysql/` in [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database), built from the General Statistics Office data | MIT |
| street names, one per line | Overpass query below | © OpenStreetMap contributors, ODbL |
| `countries.tsv` | `java.util.Locale.getISOCountries()` with English names, `CODE<TAB>name` | — |

Street names from Overpass (Ho Chi Minh City's admin boundary, named roads only):

```bash
curl -sS --max-time 300 --data-urlencode 'data=[out:csv(name;false)][timeout:280];
area["name"="Thành phố Hồ Chí Minh"]["admin_level"="4"]->.hcm;
way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian)$"]["name"](area.hcm);
out;' https://overpass-api.de/api/interpreter -o streets_raw.csv
```

Countries (any JDK 11+):

```bash
cat > Countries.java <<'EOF'
import java.util.Locale;
public class Countries {
    public static void main(String[] a) {
        for (String c : Locale.getISOCountries())
            System.out.println(c + "\t" + Locale.of("", c).getDisplayCountry(Locale.ENGLISH));
    }
}
EOF
java Countries.java > countries.tsv
```

## Run

```bash
python3 scripts/geo/build_geo_migration.py \
  --units mysql_ImportData_vn_units.sql --streets streets_raw.csv --countries countries.tsv \
  --out backend/src/main/resources/db/migration/V<yyyyMMdd><nnn>__refresh_geo_tables.sql
```

For a refresh, turn the `CREATE TABLE` statements into `DELETE`/`INSERT` (or upserts) by hand, since the tables
already exist by then.

## What the script cleans

- Streets: drops alleys (`Hẻm …`), bridges, roundabouts, junctions, lots, compounds and stations (`Bến xe`, `Bến phà`),
  plus names with `/`. Streets named after a wharf stay (`Bến Vân Đồn`).
- The input is read as CSV, because Overpass quotes a name that contains a comma.
- `"Đường Lê Lợi"` and `"Lê Lợi"` become one name, `Lê Lợi`. The prefix stays where it belongs to the name:
  `Đường số 7`, `Đường D1`, `Đường tỉnh 749A`. A bare `số 4` becomes `Đường số 4`. A name written in lower case gets a
  capital first letter.
- Spellings that fold to the same text (`Bình Giã`/`Bĩnh Giã`, `D1`/`Đường D1`) keep the most frequent one.
- Tests: `python3 -m unittest scripts/geo/test_build_geo_migration.py`.
- `streets.name_search` is folded exactly like `TextNormalizer.normalize` on the backend (lower case, no diacritics,
  `đ → d`), so a search typed without diacritics still matches.
