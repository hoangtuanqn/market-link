# Structured Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every address input becomes Country → Province → Ward → Street (suggested, free text allowed) → house
number, stored as structured columns with real foreign keys, while `address` stays as a server-composed string.

**Architecture:** A new backend module `geo` owns the master data (countries, provinces, wards, streets), a cached
`GeoDirectory`, the public `/api/v1/geo/*` lists and `AddressService.resolve`, the single place that validates a
structured address and composes the display string. `users` and `markets` embed the same `AddressColumns`. The
frontend gets one shared `AddressFields` block (native selects + an ARIA street combobox) used by every form.

**Tech Stack:** Spring Boot 4.1 / Java 25, MySQL 8.4 + Flyway, NamedParameterJdbcTemplate · React 19, TypeScript,
Tailwind 4, vitest + Testing Library, react-i18next (10 locales).

**Spec:** `docs/superpowers/specs/2026-09-27-structured-address-design.md`

**Execution mode:** Native. LEAD asked to run it end to end and review once at the end. Code bodies are written
during execution; this plan fixes file layout, names, signatures, rules and the tests that pin them.

## Global Constraints

- Vietnam: 2 levels only (34 provinces → 3,321 wards). No district level anywhere.
- Field limits: `streetName` ≤ 100, `addressLine` ≤ 60, `regionName` ≤ 60, `cityName` ≤ 60, composed `address` ≤ 255.
- `countryCode` is ISO 3166-1 alpha-2, upper case. Vietnam = `VN`.
- Server field error names: `addressParts.<field>` (e.g. `addressParts.wardCode`).
- Markets must be in `VN`. Accounts: `addressLine` required; markets: optional.
- Composed format VN: `[addressLine ]streetName, ward.full_name, province.full_name`; foreign:
  `addressLine, cityName, regionName, country.name_en`.
- Migrations `V20260927001__create_geo_tables.sql`, `V20260927002__add_structured_address_columns.sql`. Never edit
  merged migrations (R-03).
- Comments, commit messages and PR text 100% English (R-09, R-10). UI copy through i18n in 10 locales; JSON edits
  merge, never overwrite whole blocks.
- Backend style: `modules/<name>/{controllers,services/{interfaces,impl},repositories,entities,requests,resources,
  exceptions,enums}`, records, `ok()` from BaseController, per-module `@RestControllerAdvice`, Spotless AOSP.
- Frontend: tokens only (no hex), spacing tokens, `SelectField`/`Field` from `components/ui/input`.
- Every SQL value bound as a parameter (R-04).

## Review Focus

1. **Legacy account with only `address` opens the profile form** → sees "Current address: …", empty selects, and
   cannot save until the structured fields are filled; nothing crashes when `addressParts` is absent from JSON.
   (Task 10 test.)
2. **Changing province after a ward and a street were picked** → ward and street are cleared; switching country from
   VN to JP clears province/ward/street and shows region/city. (Task 9 test.)
3. **Street typed without diacritics** ("le loi") → suggestions still find "Lê Lợi"; typed text not in the list is
   kept on blur and saved as is. (Tasks 3 and 9 tests.)
4. **Ward code from another province sent straight to the API** → 400 on `addressParts.wardCode`, never a 500 from
   the composite FK. (Task 4 test.)
5. **Admin saves their account without any address** → name/phone saved, existing `address` untouched; a customer
   doing the same gets 400 `addressParts`. (Task 5 test.)

---

### Task 1: Master-data migration (countries, provinces, wards, streets)

**Files:**
- Create: `scripts/geo/README.md`, `scripts/geo/build_geo_migration.py`
- Create: `backend/src/main/resources/db/migration/V20260927001__create_geo_tables.sql`

**Interfaces — produces tables:**
- `countries(code CHAR(2) PK, name_en VARCHAR(100) NOT NULL)`
- `provinces(code VARCHAR(5) PK, name VARCHAR(100), full_name VARCHAR(120), name_en VARCHAR(100), full_name_en VARCHAR(120))`
- `wards(code VARCHAR(5) PK, province_code VARCHAR(5) NOT NULL FK → provinces, name, full_name, name_en, full_name_en, UNIQUE uq_wards_province_code(province_code, code))`
- `streets(id BIGINT UNSIGNED PK AI, province_code FK → provinces, name VARCHAR(100), name_search VARCHAR(100), UNIQUE uq_streets_province_name(province_code, name), INDEX idx_streets_search(province_code, name_search))`

- [ ] Step 1: Write `build_geo_migration.py`: input = the dataset `mysql_ImportData_vn_units.sql`, the Overpass
  `streets_raw.csv` and the `countries.tsv` (paths passed as args). It parses the provinces/wards tuples, normalises
  and dedupes streets (drop hẻm/cầu/vòng xoay/nút giao/lô/khu…, fold "Đường X" → "X" except "Đường số N" / "Đường D1"),
  computes `name_search` with the same folding as `TextNormalizer.normalize` (lowercase, `đ→d`, NFD strip marks,
  `[^a-z0-9]+ → ' '`, trim), and writes the migration with multi-row INSERTs of 500 rows each.
- [ ] Step 2: Generate the migration. The header comment records the sources, versions, licences and row counts.
- [ ] Step 3: Apply it to a throwaway DB `ml_address_check` in `intervue-mysql`, then check the counts: countries
  249, provinces 34, wards 3321, HCM wards 168, streets ≈ 5,674. Check `SELECT … WHERE name_search LIKE '%le loi%'`.
- [ ] Step 4: Commit `feat(FR-001): add the geo master data migration`.

### Task 2: Structured address columns on users and markets

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260927002__add_structured_address_columns.sql`

**Produces:** on `users` and `markets`: `country_code CHAR(2)`, `province_code VARCHAR(5)`, `ward_code VARCHAR(5)`,
`street_name VARCHAR(100)`, `address_line VARCHAR(60)`, `region_name VARCHAR(60)`, `city_name VARCHAR(60)`.
- FKs `fk_<t>_country → countries(code)` and `fk_<t>_province → provinces(code)`.
- Composite FK `fk_<t>_ward (province_code, ward_code) → wards(province_code, code)`.
- `CHECK chk_<t>_ward_has_province (ward_code IS NULL OR province_code IS NOT NULL)`.
- Drop `markets.district` and `markets.city`.

- [ ] Step 1: Write the migration.
- [ ] Step 2: Apply it on `ml_address_check` on top of every existing migration, then check:
  - Insert a user with a ward from another province → FK error.
  - `ward_code` without `province_code` → CHECK error.
- [ ] Step 3: Commit `feat(FR-001): add structured address columns to users and markets`.

### Task 3: `geo` module — directory, lists, street search

**Files (all under `backend/src/main/java/com/techx/intervue/modules/geo/`):**
- `repositories/GeoQueryRepository.java`: `List<CountryResource> countries()`, `List<ProvinceResource> provinces()`,
  `List<WardRow> wards()`, `List<StreetResource> searchStreets(String provinceCode, List<String> words, int limit)`.
- `resources/CountryResource(String code, String name)`, `ProvinceResource(String code, String name, String fullName)`,
  `WardResource(String code, String name, String fullName)`, `StreetResource(String name)`,
  `WardRow(String code, String provinceCode, String name, String fullName)`.
- `services/impl/GeoDirectory.java` (`@Component`, lazily loads once, thread-safe):
  - `Optional<CountryResource> country(String code)`
  - `Optional<ProvinceResource> province(String code)`
  - `Optional<WardRow> ward(String code)`
  - `List<CountryResource> countries()`, `List<ProvinceResource> provinces()`, `List<WardResource> wardsOf(String provinceCode)`
- `services/interfaces/GeoServiceInterface.java` + `services/impl/GeoService.java`:
  - `countries()`, `provinces()`
  - `wards(String provinceCode)` throws `ProvinceNotFoundException`
  - `streets(String provinceCode, String q)`: folds `q` with `TextNormalizer.normalize`, max 5 words, limit 20; blank → `[]`.
- `exceptions/ProvinceNotFoundException.java`, `controllers/GeoController.java` (`/api/v1/geo`),
  `controllers/GeoExceptionHandler.java` (404 `PROVINCE_NOT_FOUND`).
- Modify `config/SecurityConfig.java`: permit GET `/api/v1/geo/**`.
- Test: `backend/src/test/java/com/techx/intervue/modules/geo/services/impl/GeoServiceTest.java`,
  `GeoDirectoryTest.java`.

Street SQL: one `name_search LIKE :w<i>` (`%word%`) per word. Order by prefix match on the first word, then
`CHAR_LENGTH(name)`, then `name`. The SQL shape depends only on the word count (0–5).

Tests:
- `streetsFoldsTheQuery`: "Lê  LỢI" → words `["le","loi"]`.
- `streetsBlankReturnsEmptyWithoutQuerying`.
- `streetsCapsWordsAtFive`.
- `wardsUnknownProvinceThrows`.
- `directoryLoadsOnceAndLooksUp` (repo called once across two lookups).
- `wardsOfSortsByName`.

- [ ] Step 1: Write the failing tests. Step 2: Run them, expect FAIL. Step 3: Implement. Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(FR-001): serve countries, provinces, wards and street suggestions`.

### Task 4: `AddressService.resolve`

**Files (under `modules/geo/`):**
- `requests/AddressPartsRequest.java`: record `(countryCode, provinceCode, wardCode, streetName, addressLine,
  regionName, cityName)`, all `String`, with `@Size` limits from Global Constraints. `countryCode` is `@NotBlank`.
- `entities/AddressColumns.java`: `@Embeddable` with the 7 columns (Lombok getters/setters, no-args + all-args).
- `resources/AddressPartsResource.java`: the same 7 fields plus `static AddressPartsResource from(AddressColumns c)`
  (null-safe → null).
- `enums/AddressPolicy.java`: `ACCOUNT(lineRequired=true, vietnamOnly=false)`, `MARKET(false, true)`.
- `services/impl/ResolvedAddress.java`: record `(AddressColumns columns, String formatted, String wardName, String provinceName)`.
- `services/interfaces/AddressServiceInterface.java` + `services/impl/AddressService.java`:
  `ResolvedAddress resolve(AddressPartsRequest parts, AddressPolicy policy)`.
  Errors are thrown as `InvalidFieldException("addressParts.<field>", message)`.
- Test: `modules/geo/services/impl/AddressServiceTest.java` (`GeoDirectory` backed by a mocked `GeoQueryRepository`).

Tests:
- `vietnamAddressComposesHouseStreetWardProvince` → "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh".
- `marketWithoutHouseNumberStartsWithStreet`.
- `wardFromAnotherProvinceIsRejectedOnWardCode`.
- `unknownCountryRejected`, `unknownProvinceRejected`.
- `vietnamRequiresProvinceWardStreet` (each missing → its own field).
- `accountRequiresAddressLine`.
- `foreignRequiresRegionCityLine` and `foreignIgnoresVietnamParts` → the stored province/ward/street are null.
- `foreignComposesLineCityRegionCountry`.
- `marketOutsideVietnamRejectedOnCountryCode`.
- `trimsEveryPartAndUppercasesCountry`.
- `composedLongerThan255RejectedOnAddressLine`.

- [ ] Steps: failing tests → implement → pass → commit `feat(FR-001): validate and compose structured addresses`.

### Task 5: Accounts use `addressParts`

**Files:**
- Modify `modules/user/requests/CustomerRegisterRequest.java`: replace `String address` with
  `@NotNull(message = "Choose your address.") @Valid AddressPartsRequest addressParts`.
- Modify `modules/user/requests/UpdateProfileRequest.java`: `@Valid AddressPartsRequest addressParts` (nullable).
- Modify `modules/user/entities/User.java`: `@Embedded private AddressColumns addressParts;`.
- Modify `modules/user/resources/UserResource.java`: add `AddressPartsResource addressParts`.
- Modify `modules/user/services/impl/UserService.java`:
  - Inject `AddressServiceInterface`.
  - Register: resolve with `ACCOUNT` → set columns + `address` = formatted.
  - Update: `addressParts == null` and role is admin → keep the address; null for other roles →
    `InvalidFieldException("addressParts", "Choose your address.")`.
  - `toResource` adds `AddressPartsResource.from(user.getAddressParts())`.
- Modify tests: `CustomerRegisterRequestTest`, `UserServiceTest` (constructor + fixtures).

New tests in `UserServiceTest`:
- `signUpStoresTheComposedAddressAndParts`.
- `adminProfileUpdateWithoutAddressKeepsIt`.
- `customerProfileUpdateWithoutAddressIsRejected`.
- `profileResourceCarriesAddressParts`.

- [ ] Steps: update the fixtures, write the new failing tests → implement → pass → commit
  `feat(FR-001): accounts save a structured address`.

### Task 6: Markets use `addressParts`

**Files:**
- Modify `modules/catalog/requests/MarketRequest.java`: drop `address, district, city`; add
  `@NotNull(message = "Choose the market's address.") @Valid AddressPartsRequest addressParts`.
- Modify `modules/catalog/entities/Market.java`: drop `district`, `city`; add `@Embedded AddressColumns addressParts`.
- Modify `modules/catalog/resources/MarketResource.java`: replace `district, city` with
  `AddressPartsResource addressParts, String wardName, String provinceName`.
- Modify `modules/catalog/services/impl/MarketService.java`:
  - `apply` resolves with `MARKET`; `toResource` takes the names from `ResolvedAddress`.
  - `search(q, day, provinceCode, wardCode, page, pageSize)`.
- Modify `modules/catalog/services/interfaces/MarketServiceInterface.java` and `controllers/MarketController.java`:
  query params `provinceCode`, `wardCode`.
- Modify `modules/catalog/repositories/MarketQueryRepository.java`: select the 7 columns plus
  `w.full_name ward_name, p.full_name province_name` (LEFT JOIN); filters on `m.province_code` / `m.ward_code`.
- Tests: `MarketServiceTest` fixtures, plus `createRejectsAMarketOutsideVietnam` and
  `createReturnsWardAndProvinceNames`.

- [ ] Steps: failing tests → implement → pass → commit `feat(FR-073): markets store a structured Vietnamese address`.

### Task 7: Seed data and schema dump

**Files:**
- Modify `db/seed.sql`:
  - Markets: insert the 7 columns, drop `district`/`city`.
  - Demo users: fill the 7 columns + a composed `address`.
- Modify `db/seed-extended.sql`: append one idempotent `UPDATE users …` block. It maps the old district in `address`
  to a representative ward:
  - Quận 1 → 26740 Sài Gòn · Quận 3 → 27154 Bàn Cờ · Quận 5 → 27343 Chợ Lớn · Quận 7 → 27487 Tân Mỹ
  - Quận 10 → 27169 Diên Hồng · Bình Thạnh → 26929 · Phú Nhuận → 27073 · Tân Bình → 27004
  - Gò Vấp → 26884 · TP. Thủ Đức → 26824 · Tân Phú → 27031 · Bình Tân → 27442

  It splits "N Street" into `address_line` / `street_name`, then recomposes `address`. The block also covers
  `admin2`.
- Modify `scripts/generate-seed.js`: emit the structured columns for the next run (not re-run now).
- Regenerate `db/marketlink-schema-dump.sql` (`mysqldump --no-data`) from `ml_address_check`.

Market wards (checked against OSM on 27/09/2026):
- Bà Chiểu 26944 Gia Định, "Bạch Đằng" · Thảo Điền 27094 An Khánh, "Quốc Hương" line "10"
- Bến Thành 26743, "Lê Lợi" · Tân Định 26737, "Hai Bà Trưng" line "336"

- [ ] Step 1: Edit the seeds.
- [ ] Step 2: Run `seed.sql` then `seed-extended.sql` twice on `ml_address_check` (idempotent), then check:
  - no user with a NULL `ward_code` among the seeded accounts;
  - market names and wards are correct.
- [ ] Step 3: Commit `feat(FR-100): seed structured addresses`.

### Task 8: Frontend foundation — types, API, validation, copy

**Files:**
- Create `frontend/src/types/address.types.ts`:
  - `AddressParts = { countryCode: string; provinceCode?: string; wardCode?: string; streetName?: string;
    addressLine?: string; regionName?: string; cityName?: string }`
  - `VIETNAM = 'VN'`, `emptyAddress(): AddressParts`
  - `AddressErrors = Partial<Record<keyof AddressParts, string>>`
- Create `frontend/src/api-requests/geo.requests.ts`: `GeoApi.countries()`, `provinces()`, `wards(code)` (each
  memoised per session in a module-level `Map`; a failed request is not cached), `streets(code, q)`.
- Create `frontend/src/lib/address.ts`:
  - `validateAddress(parts, { lineRequired })`: messages via `i18n.t('address.errors.*')`.
  - `addressErrorsFrom(fieldErrors: Record<string,string>): AddressErrors`: strips `addressParts.`; a bare
    `addressParts` key maps to `countryCode`.
  - `cleanAddress(parts)`: trims every part and drops the parts that do not belong to the chosen country.
  - `sameAddress(a, b)`.
- Create `frontend/src/lib/address.test.ts`.
- Modify `frontend/src/locales/*/common.json` (10 locales): add the `address` block — `country, province, ward,
  street, addressLine, addressLineOptional, region, city, choose.{country,province,ward}, wardNeedsProvince, loading,
  loadFailed, retry, streetPlaceholder, streetHint, useTyped, noSuggestions, current` and `errors.{countryRequired,
  provinceRequired, wardRequired, streetRequired, lineRequired, regionRequired, cityRequired, tooLong}`.

Tests (`address.test.ts`):
- VN missing ward → `wardCode` error.
- Foreign missing region/city/line → three errors.
- Market policy without a line → no error.
- `addressErrorsFrom` maps prefixed keys.
- `cleanAddress` drops the VN parts for JP.
- `sameAddress` ignores surrounding whitespace.

- [ ] Steps: tests → implement → `npx vitest run src/lib/address.test.ts` PASS → commit
  `feat(FR-001): address types, geo API client and client-side rules`.

### Task 9: `StreetCombobox` and `AddressFields`

**Files:**
- Create `frontend/src/components/address/StreetCombobox.tsx`: props `{ id, label, provinceCode?, value,
  onChange(value), error?, required?, disabled? }`.
  - ARIA 1.2 combobox (`role=combobox`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `listbox`/`option`).
  - Debounce 200 ms; hides stale answers (request id).
  - Last option "Use "{{text}}"" when there is no exact (folded) match; keys ↑ ↓ Enter Esc; typed text is kept.
  - No `provinceCode` → no suggestions, still typeable.
- Create `frontend/src/components/address/AddressFields.tsx`: props `{ idPrefix, value, onChange, errors?,
  disabled?, lockCountry?: boolean, lineRequired?: boolean (default true), legacyAddress?: string }`.
  - Country options localised with `Intl.DisplayNames([i18n.language], { type: 'region' })`, falling back to
    `name`, and sorted by the localised label with Vietnam first.
  - Cascade: country change clears the rest; province change clears ward + street.
  - Every list has loading / error (Retry) states.
  - Layout: 2-column grid from `md`, full width below.
- Tests: `AddressFields.test.tsx`, `StreetCombobox.test.tsx` (GeoApi mocked with `vi.spyOn`).

Tests:
- Picking a province loads its wards; changing the province clears ward + street.
- Switching to Japan shows region/city/line and hides province/ward/street; the value has no VN parts.
- `lockCountry` renders the country disabled at Vietnam.
- Errors render under the matching control; `legacyAddress` renders "Current address: …".
- Combobox: typing "le l" (debounced) lists suggestions; ArrowDown+Enter picks one; typed "Hẻm 5" shows "Use …" and
  stays on blur.

- [ ] Steps: tests → implement → pass → commit `feat(FR-001): shared address fields with a street combobox`.

### Task 10: Account forms

**Files:**
- Modify `frontend/src/types/auth.types.ts`: `RegisterInput.addressParts: AddressParts` (drop `address`);
  `UpdateProfileInput.addressParts?: AddressParts` (drop `address`).
- Modify `frontend/src/types/user.types.ts`: `addressParts?: AddressParts`.
- Modify `frontend/src/utils/validation.ts`: `validateProfile(form)` covers name/phone only; address errors come
  from `validateAddress`.
- Modify `pages/auth/RegisterCustomer/index.tsx`, `pages/auth/CompleteProfile/index.tsx`,
  `pages/customer/Account/ProfileForm.tsx`: use `AddressFields`.
  - ProfileForm: dirty check uses `sameAddress`; `legacyAddress` is shown when the user has `address` but no
    `addressParts`.
- Modify `pages/admin/Account/index.tsx`: send `addressParts: user?.addressParts` (omitted when absent).
- Modify the locales (10) of `RegisterCustomer`, `CompleteProfile` and `CustomerAccount`: drop the unused address
  keys and the `common.validation.address*` keys; reword the intro that mentions "Street, ward, district".
- Test: `pages/customer/Account/ProfileForm.test.tsx` (Review Focus 1). A legacy user shows "Current address" and
  Save stays blocked by validation until a ward is picked.

- [ ] Steps: test → implement → `npx tsc -b && npx vitest run` → commit `feat(FR-001): sign-up and profile forms pick a structured address`.

### Task 11: Market screens

**Files:**
- Modify `frontend/src/api-requests/catalog.requests.ts`:
  - `MarketDto`: drop `district`/`city`; add `addressParts`, `wardName?`, `provinceName?`.
  - `MarketInput`: replace `address/district/city` with `addressParts`.
  - `MarketListParams`: `provinceCode?, wardCode?`.
  - `toMarket` maps `area = wardName ?? provinceName ?? ''` and `addressParts`.
- Modify `frontend/src/types/market.types.ts`: `district` → `area`; add `addressParts?: AddressParts`.
- Modify `pages/admin/MarketForm/index.tsx`:
  - Replace the address field, the district select and the city field with
    `<AddressFields lockCountry lineRequired={false} />`.
  - Map server fields `addressParts.*` onto them; drop `onDistrictChange`/`HCMC_DISTRICTS`.
  - The pin no longer jumps. The admin places it on the map or pastes coordinates, as before.
- Modify `pages/public/Markets/index.tsx`, `pages/public/Search/index.tsx`: `district` → `area`.
- Delete `frontend/src/config/districts.ts`.
- Modify `locales/*/AdminMarketForm.json` (10): drop `field.district`, `field.city`, `city`; keep `field.address` as
  the group legend.

- [ ] Steps: implement → `npx tsc -b && npx eslint . && npx vitest run` → commit `feat(FR-073): the market form and market filters use wards`.

### Task 12: Docs

**Files:**
- `docs/api-contract.md`: §1.1 register body, §1.4 `PUT /me` + the `user` shape, §3 markets (params, body,
  resource), and a new §3a Geo with the four endpoints and the `addressParts` rules.
- `docs/ASSUMPTIONS.md`: the 2-level Vietnam address, the HCM-only street list, data credits (GSO dataset MIT,
  © OpenStreetMap contributors ODbL).
- `backend/src/main/resources/user-guide/01-tai-khoan.md` (chatbot RAG): how to enter an address, if it mentions it.
- `README.md` troubleshooting: none needed (new migrations only).

- [ ] Commit `docs(FR-001): contract and assumptions for structured addresses`.

### Task 13: Verification

- [ ] Backend: full suite in a throwaway container with `-Xmx`, pointed at a scratch MySQL schema; plus `spotless:check`.
- [ ] Frontend: `prettier --check`, `eslint`, `tsc -b`, `vitest run`, `vite build`.
- [ ] Runtime: run a backend container of this branch (DB `ml_address_e2e`, migrated + seeded), and Vite on the host
  pointed at it, then check:
  - curl the geo endpoints;
  - register a new customer (VN and JP);
  - edit the profile of a legacy account;
  - admin edits Chợ Tân Định;
  - `/markets` area filter;
  - screenshots at 375 / 1440, light and dark.
- [ ] Whole-branch review (fresh reviewer) → fix → final report to LEAD.
