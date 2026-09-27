# Database

The live schema is built by Flyway from `backend/src/main/resources/db/migration/` every time the backend starts.
The files here are for reading, reviewing and demo data. None of them is run automatically.

| Path | What it is |
|---|---|
| `schema.sql` | The target schema designed before coding (19 tables). LEAD-owned (CLAUDE.md R-02) |
| `marketlink-schema-dump.sql` | `mysqldump --no-data` of the tables the migrations actually create, for comparison with `schema.sql` |
| `seed.sql` | Demo data: 4 markets, 10 approved stalls, 51 products, orders in all 6 statuses, reviews, favourites. Idempotent |
| `seed-images/` | Product photos by category, collected for the demo data. Not referenced by `seed.sql` yet |

Load the demo data once the stack is up:

```bash
make seed
```

The accounts it creates are listed in [`docs/DEMO_CREDENTIALS.md`](../docs/DEMO_CREDENTIALS.md). A schema change always
goes through a new migration, never an edit to a merged one (CLAUDE.md R-03).
