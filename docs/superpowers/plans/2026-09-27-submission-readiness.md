# MarketLink Submission Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đóng mọi việc tồn đọng giữa `origin/dev` @ `abdbb371` và bộ hồ sơ nộp bài TechWiz 7 hoàn chỉnh — 4 việc code còn hở so với SRS §1.6, và 4 deliverable bắt buộc của SRS §1.9 chưa có.

**Architecture:** Tách làm hai pha. **Pha A (Task 1–4)** là code: sửa ba chỗ lệch SRS trên frontend (About thiếu tên đội, nhãn tiền tệ sai, `/search` thiếu facet) và một vòng QA responsive. Mỗi task là một PR riêng vào `dev`, có test Vitest đi kèm. **Pha B (Task 5–8)** là hồ sơ nộp bài: một script đóng gói zip, một vòng test 4 trình duyệt, dàn ý Project Report do người viết, và video demo quay theo `docs/requirements/SRS-COVERAGE.md`. Pha B không sửa code sản phẩm, trừ script đóng gói.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind 4 · react-i18next (10 ngôn ngữ) · Vitest + Testing Library · Java Spring Boot + MySQL 8.4 (không đụng tới trong plan này) · Docker Compose (`make up`).

**Spec:**
- `docs/requirements/MarketLink-SRS.pdf` — đề gốc (§1.5 Constraints, §1.6 Functional Requirements, §1.9 Project Deliverables)
- `docs/requirements/SRS-COVERAGE.md` — bảng ánh xạ §1.6 → FR → URL, đồng thời là kịch bản quay video
- `.ai/REQUIREMENTS.md` — danh sách FR, nhãn MUST/SHOULD/NICE
- `TechWiz 7-Evaluation Parameters.pdf` — thang điểm End-to-End: Functionality 35 · UI & Accessibility 15 · Source Code 10 · Database 10 · Compatibility 5 · Documentation 10 · Plagiarism 10 · Ontime 5

---

## Global Constraints

Mọi task đều phải thoả những điều sau. Đây là luật của repo (`CLAUDE.md`, `CONTRIBUTING.md` §0) và của đề.

- **R-01** · Mỗi thay đổi gắn ít nhất một `FR-xxx`. Ghi ID vào commit và PR: `feat(FR-082): ...`.
- **R-07** · Không làm tính năng không có trong `.ai/REQUIREMENTS.md`. Thấy thiếu thì báo LEAD, không tự thêm.
- **R-08** · **Không commit, push hay merge thẳng vào `dev` hoặc `main`.** Trước khi sửa file chạy `git branch --show-current`; đang ở `dev`/`main` thì tạo nhánh mới từ `origin/dev` trước. Tên nhánh không được bắt đầu bằng `merge/` (vi phạm H-2).
- **R-09** · Comment trong code viết **100% tiếng Anh** ở mọi loại file. Không áp dụng cho chữ hiển thị cho người dùng trong `locales/*` (bản `vi` vẫn là tiếng Việt) và cho file `.md`.
- **R-10** · Commit message, tiêu đề PR và mô tả PR viết **100% tiếng Anh**, dạng `<type>(FR-xxx): <English description>`.
- **10 ngôn ngữ đồng bộ**: mọi key i18n phải có mặt ở cả `de en es fr id ja ko th vi zh`. Thiếu một file là ngôn ngữ đó hiện key thô ra màn hình.
- **Design system**: mọi UI mới theo `docs/design-system/README.md` — dùng component `ml-*` và token có sẵn, không viết màu hay khoảng cách bằng tay.
- **Gate trước mỗi commit**: `cd frontend && npx tsc -b && npx eslint src && npx vitest run` — cả ba phải xanh.
- **Đề cấm AI viết tài liệu**: SRS trang 13 — *"Do not use AI tools to fully produce ready-made documentation. This is strictly forbidden."* Task 7 và Task 8 là việc của người; AI chỉ được dựng dàn ý, trích số liệu từ repo và soát lỗi.
- **Tài liệu không được chứa source code** (SRS §1.9). Project Report chỉ có sơ đồ, mô tả module và ảnh màn hình.

### Chuẩn bị một lần trước Task 1

```bash
cd /Users/phong/projects/school/fpt-aptech/Code_project/techwiz7/market-link
git fetch origin
git worktree add ../market-link-submit -b feature/FR-082-submission-readiness origin/dev
cd ../market-link-submit/frontend && npm install
```

Checkout `market-link` hiện chậm 13 commit so với `origin/dev` — **không** làm việc trực tiếp ở đó.

---

## Review Focus

Năm chỗ đề ngụ ý nhưng không task nào tự nhiên chạm tới. Mỗi dòng đã được gắn vào task sở hữu đoạn code đó, dưới dạng một step test riêng.

1. **Thiếu key i18n ở một trong mười ngôn ngữ** → màn hình hiện key thô (`team.namePending`) thay vì chữ. Người dùng tiếng Nhật hay tiếng Thái thấy chuỗi lập trình trên trang About. → Test ở **Task 1, Step 6**.
2. **Đổi facet nhưng chưa bấm Search** → keyword nằm ở URL và cần submit, còn facet là state cục bộ. Người dùng chọn "Rau củ" rồi ngồi chờ, không hiểu sao kết quả không đổi. Facet phải áp dụng ngay. → Test ở **Task 3, Step 3**.
3. **Facet không áp dụng được cho mọi loại kết quả** → chợ không có category, sạp không có giá. Chọn "dưới $1" rồi xem tab Markets mà số chợ tụt về 0 là sai; số chợ phải giữ nguyên. → Test ở **Task 3, Step 7**.
4. **Lọc giá đi cùng sắp xếp theo giá** → `minPrice`/`maxPrice` và `sort=price_asc` gửi cùng một request, không được ghi đè nhau. → Test ở **Task 3, Step 9**.
5. **Bảng dữ liệu dài ở 375px** → mọi trang admin và farmer dùng `DataTable`; ở màn 375px bảng nhiều cột đẩy `body` rộng ra, sinh thanh cuộn ngang toàn trang. Rubric UI 15đ chấm đúng chỗ này. → Kiểm ở **Task 4, Step 2**.

---

## Task 1: Trang About — tên đội thật, nguồn ảnh, nhãn tiền tệ (FR-082)

Đây là dòng duy nhất của SRS §1.6 còn thiếu hẳn. `pages/public/About/index.tsx:88` đang render `t('team.namePending')` = **"Name to add"** cho cả sáu người. Đề còn yêu cầu Project Report ghi *"tasks allotted to team"*, nên sáu cái tên này phải có thật.

Nhân tiện sửa hai chuỗi sai trong cùng khối `credits`:
- `credits.localeValue` ghi *"Vietnamese đồng"* trong khi `lib/format.ts` khoá cứng `currency: 'USD'` và giá hiện ra là `$4.50 / kg`.
- `credits.photosValue` ghi *"Placeholders for now"* trong khi trang đang nạp ảnh thật từ `images.unsplash.com` (xem `SLIDES` ở `index.tsx:11-16`). SRS §1.5 nói rõ ảnh phải tuân thủ bản quyền — ghi rõ nguồn là cách trả lời điều đó.

**Dữ liệu LEAD phải điền trước khi chạy task này.** Tên hiển thị trên trang, không dịch sang mười ngôn ngữ.

| Khoá | Vai trong repo | Vai hiện trên màn hình | Họ tên |
|---|---|---|---|
| `lead` | LEAD | Team lead | ⟨LEAD điền⟩ |
| `be1` | BE1 | Backend | ⟨LEAD điền⟩ |
| `be2` | BE2 | Backend | ⟨LEAD điền⟩ |
| `fe1` | FE1 | Frontend | ⟨LEAD điền⟩ |
| `fe2` | FE2 | Frontend | ⟨LEAD điền⟩ |
| `qa` | QA/DOC | Quality and documents | ⟨LEAD điền⟩ |

**Files:**
- Modify: `frontend/src/pages/public/About/index.tsx:20-26` (thêm `MEMBERS`), `:88` (đổi render)
- Modify: `frontend/src/locales/{de,en,es,fr,id,ja,ko,th,vi,zh}/About.json` — xoá `team.namePending`, sửa `credits.localeValue` và `credits.photosValue`
- Test: `frontend/src/pages/public/About/index.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: không có — task đầu tiên.
- Produces: `export const MEMBERS: Record<(typeof TEAM)[number], string>` từ `pages/public/About/index.tsx`. Task 7 (Project Report) đọc chính hằng này để lấy bảng phân công, không gõ lại tên.

- [ ] **Step 1: Viết test thất bại — sáu cái tên phải có trên trang**

Tạo `frontend/src/pages/public/About/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import AboutPage, { MEMBERS } from './index';

const about = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

describe('About page (FR-082)', () => {
  it('names every member of the team instead of a placeholder', () => {
    about();
    for (const name of Object.values(MEMBERS)) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('Name to add')).not.toBeInTheDocument();
  });

  it('credits the photo source and names the currency the prices are actually in', () => {
    about();
    expect(screen.getByText(/Unsplash/)).toBeInTheDocument();
    expect(screen.getByText(/US dollars/)).toBeInTheDocument();
    expect(screen.queryByText(/đồng/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận nó hỏng**

```bash
cd frontend && npx vitest run src/pages/public/About/index.test.tsx
```

Kỳ vọng: FAIL. Lỗi đầu tiên là `MEMBERS` không được export từ `./index`.

- [ ] **Step 3: Thêm hằng `MEMBERS` vào `About/index.tsx`**

> ⚠️ **Sáu chuỗi dưới đây KHÔNG phải tên thật** — chúng chỉ giữ chỗ cho đúng cú pháp. Chép sáu họ tên từ
> cột "Họ tên" của bảng đầu Task 1 vào đây. Task này chưa xong chừng nào bảng đó còn ô ⟨LEAD điền⟩.

Ngay dưới khối `TEAM` hiện có (`index.tsx:18-26`), thêm:

```tsx
/**
 * Real names, in the same order as TEAM. Names are not translated, so they live here and not in About.json: one place
 * to edit, and no risk of a locale falling behind the others.
 */
export const MEMBERS: Record<(typeof TEAM)[number], string> = {
  lead: 'HỌ TÊN LEAD',
  be1: 'HỌ TÊN BE1',
  be2: 'HỌ TÊN BE2',
  fe1: 'HỌ TÊN FE1',
  fe2: 'HỌ TÊN FE2',
  qa: 'HỌ TÊN QA',
};
```

- [ ] **Step 4: Đổi chỗ render tên**

Ở `About/index.tsx:88`, đổi:

```tsx
              <b className="text-[16px]">{t('team.namePending')}</b>
```

thành:

```tsx
              <b className="text-[16px]">{MEMBERS[key]}</b>
```

- [ ] **Step 5: Sửa mười file locale**

Ở mỗi `frontend/src/locales/<lang>/About.json`: **xoá** khoá `team.namePending`, và thay hai giá trị trong khối `credits`. Nội dung từng ngôn ngữ:

| lang | `credits.photosValue` | `credits.localeValue` |
|---|---|---|
| `de` | `Fotos von Unsplash, unter der Unsplash-Lizenz` | `US-Dollar, Datum im Format {{format}}, 24-Stunden-Uhr, {{zone}}` |
| `en` | `Photos from Unsplash, under the Unsplash License` | `US dollars, dates {{format}}, 24-hour clock, {{zone}}` |
| `es` | `Fotos de Unsplash, bajo la Licencia Unsplash` | `Dólares estadounidenses, fechas {{format}}, reloj de 24 horas, {{zone}}` |
| `fr` | `Photos d'Unsplash, sous licence Unsplash` | `Dollars américains, dates au format {{format}}, horloge 24 heures, {{zone}}` |
| `id` | `Foto dari Unsplash, dengan Lisensi Unsplash` | `Dolar AS, tanggal {{format}}, format 24 jam, {{zone}}` |
| `ja` | `写真は Unsplash より、Unsplash ライセンスに基づく` | `米ドル、日付は {{format}}、24 時間表記、{{zone}}` |
| `ko` | `사진 출처 Unsplash, Unsplash 라이선스` | `미국 달러, 날짜 {{format}}, 24시간제, {{zone}}` |
| `th` | `ภาพจาก Unsplash ภายใต้สัญญาอนุญาต Unsplash` | `ดอลลาร์สหรัฐ วันที่แบบ {{format}} นาฬิกา 24 ชั่วโมง {{zone}}` |
| `vi` | `Ảnh lấy từ Unsplash, theo giấy phép Unsplash` | `Đô la Mỹ, ngày dạng {{format}}, đồng hồ 24 giờ, {{zone}}` |
| `zh` | `照片来自 Unsplash，遵循 Unsplash 许可` | `美元，日期格式 {{format}}，24 小时制，{{zone}}` |

- [ ] **Step 6: Test — không ngôn ngữ nào còn sót key (Review Focus #1)**

Thêm vào `About/index.test.tsx`:

```tsx
import de from '@/locales/de/About.json';
import en from '@/locales/en/About.json';
import es from '@/locales/es/About.json';
import fr from '@/locales/fr/About.json';
import id from '@/locales/id/About.json';
import ja from '@/locales/ja/About.json';
import ko from '@/locales/ko/About.json';
import th from '@/locales/th/About.json';
import vi from '@/locales/vi/About.json';
import zh from '@/locales/zh/About.json';

const LOCALES = { de, en, es, fr, id, ja, ko, th, vi, zh };

describe('About translations stay in step across all ten languages', () => {
  it('has no leftover name placeholder in any language', () => {
    for (const [lang, file] of Object.entries(LOCALES)) {
      expect(file.team, lang).not.toHaveProperty('namePending');
    }
  });

  it('gives every language the same set of keys as English', () => {
    const flat = (o: object, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v !== null && typeof v === 'object' ? flat(v as object, `${p}${k}.`) : [`${p}${k}`],
      );
    const expected = flat(en).sort();
    for (const [lang, file] of Object.entries(LOCALES)) {
      expect(flat(file).sort(), lang).toEqual(expected);
    }
  });
});
```

- [ ] **Step 7: Chạy lại test, xác nhận xanh**

```bash
cd frontend && npx vitest run src/pages/public/About/index.test.tsx
```

Kỳ vọng: PASS, 4 test.

- [ ] **Step 7b: Chốt thông tin liên hệ thật cho trang Contact (FR-083)**

`locales/*/Contact.json` đang để dữ liệu bịa: `contact@marketlink.vn`, `090 123 4567`, `123 Lê Lợi, Phường Bến Nghé, Quận 1`. Đề chỉ đòi *"static team contact information"*, nên dữ liệu bịa không sai luật — nhưng nếu đội có email hoặc số điện thoại dùng chung thật thì thay vào sẽ trả lời được khi giám khảo hỏi.

LEAD quyết một trong hai, rồi ghi lựa chọn vào `docs/ASSUMPTIONS.md`:

- **Thay bằng thật** → sửa `team.emailValue`, `team.phoneValue`, `team.addressValue` ở cả mười file, và sửa toạ độ ghim trong `pages/public/Contact/index.tsx` cho khớp địa chỉ mới.
- **Giữ dữ liệu mẫu** → thêm một dòng vào `docs/ASSUMPTIONS.md`: *"Thông tin liên hệ trên trang Contact là dữ liệu mẫu của đồ án, không phải địa chỉ thật."*

- [ ] **Step 8: Gate + commit**

```bash
cd frontend && npx tsc -b && npx eslint src && npx vitest run
cd .. && git add frontend/src/pages/public/About frontend/src/locales docs/ASSUMPTIONS.md
git commit -m "feat(FR-082): name the team on About, credit the photos and the real currency

The team section rendered a placeholder for all six members, and the credits
block named Vietnamese dong while every price on the site is formatted in USD.
Names live in a MEMBERS constant because they are not translated."
```

- [ ] **Step 9: Kiểm tay trên stack thật**

```bash
make up
```

Mở `http://localhost:3000/about`, xác nhận: sáu thẻ có tên thật; khối "Credits and data" ghi Unsplash và US dollars. Đổi ngôn ngữ sang 日本語 rồi ไทย, xác nhận không có chuỗi nào dạng `team.` hay `credits.` hiện ra.

---

## Task 2: Bỏ bí danh `vnd` trỏ vào hàm format USD

`lib/format.ts:28` có `export const vnd = money;` — một hàm tên `vnd` trả về `$4.50`. 21 file đang gọi nó. Giám khảo có thể hỏi *"tại sao hàm tên vnd lại in ra đô la"* và đó là câu hỏi không có câu trả lời hay. Đổi hết về `money`, xoá bí danh.

Task này thuần cơ học, không đổi hành vi — test hiện có là lưới an toàn.

**Files:**
- Modify: `frontend/src/lib/format.ts:27-29`
- Modify: 21 file gọi `vnd` (liệt kê bằng lệnh ở Step 1)
- Test: không tạo mới; bộ test hiện có phải giữ nguyên kết quả

**Interfaces:**
- Consumes: không.
- Produces: `money(amount: number): string` là tên duy nhất còn lại để format tiền. `vnd` và `usd` biến mất khỏi `lib/format.ts`.

- [ ] **Step 1: Chụp lại kết quả test trước khi đổi**

```bash
cd frontend && npx vitest run 2>&1 | tail -5
grep -rl "\bvnd\b" src | sort
```

Ghi lại số test pass. Sau Step 4 con số phải y hệt.

- [ ] **Step 2: Đổi tên ở mọi chỗ gọi**

```bash
cd frontend
grep -rl "\bvnd\b" src | xargs sed -i '' 's/\bvnd\b/money/g'
```

- [ ] **Step 3: Dọn `lib/format.ts`**

Xoá hai dòng bí danh (`format.ts:27-29`):

```ts
/** Alias to money() locked to USD across the entire application. */
export const vnd = money;
export const usd = money;
```

Sau `sed` ở Step 2, dòng đầu đã thành `export const money = money;` — xoá cả ba dòng đó đi, giữ lại `export const RATES_DATE = '26/09/2026';`. Đồng thời sửa comment của `money()` (`format.ts:14-17`), bỏ câu nhắc tới tên cũ:

```ts
/**
 * Locked to USD (user decision 2026-09-26) — no per-reader currency choice. `amount` is a plain number of dollars,
 * not cents.
 */
```

- [ ] **Step 4: Chạy gate, đối chiếu với Step 1**

```bash
cd frontend && npx tsc -b && npx eslint src && npx vitest run
```

Kỳ vọng: số test pass **bằng đúng** con số ghi ở Step 1. `tsc` không báo lỗi `Cannot find name 'vnd'`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "chore(FR-022): drop the vnd alias that formatted US dollars

A helper named vnd returning \$4.50 is a question with no good answer. Every
call site now uses money() directly."
```

---

## Task 3: `/search` — thêm bộ lọc danh mục, giá và chợ (FR-023)

SRS §1.6 *Search, Sort, Filter*: *"Customers should be able to search markets, Farmers, or products based on filters like **location, category, price**, and market day."*

`pages/public/Search/index.tsx` hiện có keyword + ngày + sắp xếp + tab phạm vi + bản đồ. Thiếu **category**, **price**, **market**. Trang `/products` đã có đủ cả ba (`Products/index.tsx:37-68`), task này bê nguyên khuôn đó sang.

Ba facet không áp dụng được cho cả ba loại kết quả, và đó là điều phải làm cho đúng chứ không được lờ đi:

| Facet | Products | Stalls | Markets |
|---|---|---|---|
| Category | `categoryId` trong request | không áp dụng | không áp dụng |
| Price | `minPrice`/`maxPrice` trong request | không áp dụng | không áp dụng |
| Market | `marketId` trong request | `marketId` trong request | lọc client theo `id` |

**Files:**
- Modify: `frontend/src/pages/public/Search/index.tsx` — thêm state facet (sau `:41`), nạp categories + markets, đưa facet vào ba request (`:52-68`), thêm UI vào hàng filter (`:145-170`)
- Modify: `frontend/src/locales/{de,en,es,fr,id,ja,ko,th,vi,zh}/Search.json` — thêm khối `filters` và `price`
- Test: `frontend/src/pages/public/Search/index.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `ProductApi.list(params: ProductListParams)` với `categoryId?: number`, `marketId?: number`, `minPrice?: number`, `maxPrice?: number` · `StallApi.list({ q, marketId, day, page, pageSize })` · `CatalogApi.listMarkets(params: MarketListParams)` · `CatalogApi.listCategories(): Promise<CategoryType[]>` · `money()` từ `lib/format` (sau Task 2) · `SelectField` từ `components/ui/input` với props `{ id, label, options: { value, label }[], value, onChange }` · `Chip` từ `components/ui/chip` với props `{ pressed, onClick }`.
- Produces: không có task nào phụ thuộc.

- [ ] **Step 1: Viết test thất bại — facet danh mục phải thu hẹp kết quả**

Tạo `frontend/src/pages/public/Search/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi from '@/api-requests/stall.requests';
import SearchPage from './index';

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 50, total: items.length });

const market = {
  id: 7,
  name: 'Chợ Bà Chiểu',
  area: 'Bình Thạnh',
  address: '1 Bùi Hữu Nghĩa',
  lat: 10.8,
  lng: 106.7,
  days: [0, 1, 2, 3, 4, 5, 6],
  opensAt: '05:00',
  closesAt: '11:00',
  stalls: 3,
  image: null,
};

const product = {
  id: 31,
  name: 'Rau muống',
  stall: 'Vườn Út Hiền',
  marketName: 'Chợ Bà Chiểu',
  category: 'Rau củ',
  categoryId: 2,
  price: 0.8,
  unit: 'kg',
  stock: 20,
  status: 'available',
  farmerId: 4,
  image: null,
  rating: 0,
  ratingCount: 0,
};

const searchFor = (q: string) =>
  render(
    <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(q)}&scope=all`]}>
      <SearchPage />
    </MemoryRouter>,
  );

describe('Search facets (FR-023)', () => {
  beforeEach(() => {
    vi.spyOn(CatalogApi, 'listCategories').mockResolvedValue([
      { id: 2, name: 'Rau củ', slug: 'rau-cu', sortOrder: 1, isActive: true, count: 0, minShelfLifeDays: 1, maxShelfLifeDays: 5 },
      { id: 3, name: 'Trái cây', slug: 'trai-cay', sortOrder: 2, isActive: true, count: 0, minShelfLifeDays: 2, maxShelfLifeDays: 9 },
    ]);
    vi.spyOn(CatalogApi, 'listMarkets').mockResolvedValue(page([market]) as never);
    vi.spyOn(StallApi, 'list').mockResolvedValue(page([]) as never);
    vi.spyOn(ProductApi, 'list').mockResolvedValue(page([product]) as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the chosen category to the product list', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');

    await userEvent.selectOptions(screen.getByLabelText('Category'), '2');

    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 2 })),
    );
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận nó hỏng**

```bash
cd frontend && npx vitest run src/pages/public/Search/index.test.tsx
```

Kỳ vọng: FAIL — `Unable to find a label with the text of: Category`.

- [ ] **Step 3: Test — facet áp dụng ngay, không cần bấm Search (Review Focus #2)**

Thêm vào cùng file:

```tsx
  it('applies a facet immediately, without another press on Search', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');
    const before = vi.mocked(ProductApi.list).mock.calls.length;

    await userEvent.selectOptions(screen.getByLabelText('Category'), '3');

    // No click on the Search button in between: the request goes out on its own.
    await waitFor(() => expect(vi.mocked(ProductApi.list).mock.calls.length).toBeGreaterThan(before));
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
```

- [ ] **Step 4: Thêm state và dữ liệu cho facet**

Trong `Search/index.tsx`, ngay dưới khối hằng đầu file (sau `const FETCH_SIZE = 50;`), thêm — giống hệt `Products/index.tsx:16-32` để hai trang hiểu giá như nhau:

```tsx
const LOW = 1;
const HIGH = 3;
/** Price bands become `minPrice`/`maxPrice` on the request (contract §5); prices are USD with cents. */
const PRICE_BANDS = [
  { value: 'any', min: undefined, max: undefined },
  { value: 'low', min: undefined, max: LOW - 0.01 },
  { value: 'mid', min: LOW, max: HIGH },
  { value: 'high', min: HIGH + 0.01, max: undefined },
] as const;
type PriceBand = (typeof PRICE_BANDS)[number]['value'];
/** The market facet's "no filter" value. */
const ALL_MARKETS = 'all';
```

Trong thân `SearchPage`, sau dòng `const [tab, setTab] = useState<...>('all');` (`:41`), thêm:

```tsx
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priceBand, setPriceBand] = useState<PriceBand>('any');
  const [marketFilter, setMarketFilter] = useState(ALL_MARKETS);

  // The facet lists are small and shared with /products; they load once and do not depend on the keyword.
  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const { state: facetMarketsLoad } = useRequest('facet-markets', () =>
    CatalogApi.listMarkets({ pageSize: 50 }).then((result) => result.items),
  );
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : [];
  const facetMarkets = facetMarketsLoad.kind === 'ready' ? facetMarketsLoad.data : [];
```

- [ ] **Step 5: Đưa facet vào ba request**

Thay nguyên khối `useRequest` ở `:52-68` bằng:

```tsx
  const band = PRICE_BANDS.find((b) => b.value === priceBand)!;
  const marketId = marketFilter === ALL_MARKETS ? undefined : Number(marketFilter);
  const { state: load, retry } = useRequest(
    `search:${keyword}:${day}:${sort}:${categoryId ?? ''}:${priceBand}:${marketFilter}`,
    () =>
      keyword === ''
        ? Promise.resolve(NO_RESULTS)
        : Promise.all([
            CatalogApi.listMarkets({ q: keyword, day, pageSize: FETCH_SIZE }),
            StallApi.list({ q: keyword, day, marketId, pageSize: FETCH_SIZE }),
            ProductApi.list({
              q: keyword,
              day,
              marketId,
              categoryId: categoryId ?? undefined,
              minPrice: band.min,
              maxPrice: band.max,
              pageSize: FETCH_SIZE,
              sort: sort === 'price' ? 'price_asc' : sort === 'rating' ? 'rating' : 'newest',
            }),
          ]).then(([markets, stalls, products]) => ({
            // A market has no category and no price, so only the market facet can narrow this list, and it does so
            // here rather than on the server: /markets takes no marketId, the market *is* the result.
            markets: marketId == null ? markets.items : markets.items.filter((m) => m.id === marketId),
            farmers: stalls.items.map((s) => toStallCard(s, 0, '')),
            products: products.items,
          })),
  );
```

- [ ] **Step 6: Thêm UI facet vào hàng filter**

Trong khối `<div className="flex flex-wrap items-start gap-6">` (`:145`), sau `<DayChips ... />` và trước khối "sort", chèn:

```tsx
          <SelectField
            id="q-category"
            label={t('filters.category')}
            value={categoryId === null ? '' : String(categoryId)}
            onChange={(e) => setCategoryId(e.target.value === '' ? null : Number(e.target.value))}
            options={[
              { value: '', label: t('filters.allCategories') },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <SelectField
            id="q-market"
            label={t('filters.market')}
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            options={[
              { value: ALL_MARKETS, label: t('filters.allMarkets') },
              ...facetMarkets.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">{t('filters.price')}</span>
            <div className="flex flex-wrap gap-2">
              {PRICE_BANDS.map((b) => (
                <Chip key={b.value} pressed={priceBand === b.value} onClick={() => setPriceBand(b.value)}>
                  {t(`price.${b.value}`, { low: money(LOW), high: money(HIGH) })}
                </Chip>
              ))}
            </div>
          </div>
```

Bổ sung import ở đầu file: `SelectField` từ `@/components/ui/input`, và thêm `money` vào dòng import sẵn có từ `@/lib/format`.

- [ ] **Step 7: Test — facet giá không làm rơi kết quả chợ (Review Focus #3)**

Thêm vào `Search/index.test.tsx`:

```tsx
  it('keeps every market in the results when a price band is chosen', async () => {
    searchFor('rau');
    await screen.findByText('Chợ Bà Chiểu');

    await userEvent.click(screen.getByRole('button', { name: /Under/ }));

    // A market has no price. Narrowing by price must not make markets disappear.
    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ maxPrice: 0.99 })),
    );
    expect(screen.getByText('Chợ Bà Chiểu')).toBeInTheDocument();
  });
```

- [ ] **Step 8: Thêm chữ vào mười file locale**

Vào mỗi `frontend/src/locales/<lang>/Search.json`, thêm hai khối `filters` và `price` ở cấp cao nhất. Chữ lấy đúng từ `Products.json` cùng ngôn ngữ để hai trang gọi cùng một thứ bằng cùng một từ; riêng `allCategories` là khoá mới. Nội dung đầy đủ cho cả mười file:

```json
// de
  "filters": { "category": "Kategorie", "allCategories": "Alle Kategorien", "market": "Markt", "allMarkets": "Alle Märkte", "price": "Preis pro Einheit" },
  "price": { "any": "Jeder Preis", "low": "Unter {{low}}", "mid": "{{low}} – {{high}}", "high": "Über {{high}}" }

// en
  "filters": { "category": "Category", "allCategories": "All categories", "market": "Market", "allMarkets": "All markets", "price": "Price per unit" },
  "price": { "any": "Any price", "low": "Under {{low}}", "mid": "{{low}} – {{high}}", "high": "Over {{high}}" }

// es
  "filters": { "category": "Categoría", "allCategories": "Todas las categorías", "market": "Mercado", "allMarkets": "Todos los mercados", "price": "Precio por unidad" },
  "price": { "any": "Cualquier precio", "low": "Menos de {{low}}", "mid": "{{low}} – {{high}}", "high": "Más de {{high}}" }

// fr
  "filters": { "category": "Catégorie", "allCategories": "Toutes les catégories", "market": "Marché", "allMarkets": "Tous les marchés", "price": "Prix unitaire" },
  "price": { "any": "Tous les prix", "low": "Moins de {{low}}", "mid": "{{low}} – {{high}}", "high": "Plus de {{high}}" }

// id
  "filters": { "category": "Kategori", "allCategories": "Semua kategori", "market": "Pasar", "allMarkets": "Semua pasar", "price": "Harga per satuan" },
  "price": { "any": "Semua harga", "low": "Di bawah {{low}}", "mid": "{{low}} – {{high}}", "high": "Di atas {{high}}" }

// ja
  "filters": { "category": "カテゴリ", "allCategories": "すべてのカテゴリ", "market": "マーケット", "allMarkets": "すべてのマーケット", "price": "単価" },
  "price": { "any": "すべての価格", "low": "{{low}} 未満", "mid": "{{low}} – {{high}}", "high": "{{high}} 超" }

// ko
  "filters": { "category": "카테고리", "allCategories": "모든 카테고리", "market": "장터", "allMarkets": "모든 장터", "price": "단위당 가격" },
  "price": { "any": "모든 가격", "low": "{{low}} 미만", "mid": "{{low}} – {{high}}", "high": "{{high}} 초과" }

// th
  "filters": { "category": "หมวดหมู่", "allCategories": "ทุกหมวดหมู่", "market": "ตลาด", "allMarkets": "ทุกตลาด", "price": "ราคาต่อหน่วย" },
  "price": { "any": "ทุกราคา", "low": "ต่ำกว่า {{low}}", "mid": "{{low}} – {{high}}", "high": "มากกว่า {{high}}" }

// vi
  "filters": { "category": "Loại", "allCategories": "Mọi loại", "market": "Chợ", "allMarkets": "Mọi chợ", "price": "Giá mỗi đơn vị" },
  "price": { "any": "Mọi mức giá", "low": "Dưới {{low}}", "mid": "{{low}} – {{high}}", "high": "Trên {{high}}" }

// zh
  "filters": { "category": "类别", "allCategories": "所有类别", "market": "市集", "allMarkets": "所有市集", "price": "单价" },
  "price": { "any": "不限价格", "low": "低于 {{low}}", "mid": "{{low}} – {{high}}", "high": "高于 {{high}}" }
```

Test ở Step 1 tìm nhãn `'Category'` và nút `/Under/`, nên bản `en` phải khớp đúng chữ trên.

- [ ] **Step 9: Test — lọc giá và sắp xếp theo giá cùng tồn tại (Review Focus #4)**

Thêm vào `Search/index.test.tsx`:

```tsx
  it('sends the price band and the price sort in the same request', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');

    await userEvent.click(screen.getByRole('button', { name: /Under/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Price' }));

    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxPrice: 0.99, sort: 'price_asc' }),
      ),
    );
  });
```

- [ ] **Step 10: Chạy test, xác nhận xanh**

```bash
cd frontend && npx vitest run src/pages/public/Search/index.test.tsx
```

Kỳ vọng: PASS, 4 test.

- [ ] **Step 11: Gate + commit**

```bash
cd frontend && npx tsc -b && npx eslint src && npx vitest run
cd .. && git add frontend/src/pages/public/Search frontend/src/locales
git commit -m "feat(FR-023): filter search by category, price and market

The SRS asks for search filtered by location, category, price and market day.
The page had keyword, day and sort only. Markets carry no category or price, so
the market facet narrows them client-side and the other two leave them alone."
```

- [ ] **Step 12: Kiểm tay**

```bash
make up && make seed
```

Mở `http://localhost:3000/search?q=rau&scope=all`. Chọn danh mục "Rau củ" → danh sách sản phẩm thu hẹp ngay, không phải bấm Search. Chọn dải giá "Dưới $1" → số chợ ở tab Markets **không đổi**. Chọn chợ "Chợ Bà Chiểu" → cả ba tab chỉ còn thứ thuộc chợ đó, bản đồ chỉ còn một ghim.

---

## Task 4: Vòng QA responsive 375 / 768 / 1440 (FR-080)

Rubric UI & Accessibility là **15 điểm** và chấm rõ *"Test the Web application for responsiveness on different gadgets"*. Nghi vấn còn treo từ phiên trước: trang Settings tràn ngang ở 375px. Task này đi hết mọi trang, tìm và sửa tràn ngang.

Cách phát hiện chắc chắn nhất là so `document.documentElement.scrollWidth` với `window.innerWidth` — hơn là nhìn bằng mắt.

**Files:**
- Modify: chỉ những file lộ ra ở Step 2–3; phần lớn là thêm `overflow-x-auto` cho vùng bảng, hoặc `min-w-0` cho ô flex/grid
- Test: `frontend/src/pages/<trang bị lỗi>/index.test.tsx` — chỉ thêm khi lỗi nằm ở logic; lỗi thuần CSS thì bằng chứng là ảnh chụp

**Interfaces:**
- Consumes: mọi trang đã hoàn thiện sau Task 1–3.
- Produces: `docs/submission/responsive-check.md` — bảng trang × 3 bề rộng, có kết luận, dùng lại trong Project Report (Task 7).

- [ ] **Step 1: Dựng danh sách URL phải kiểm**

Tạo `docs/submission/responsive-check.md` với khung sau, lấy URL từ `docs/requirements/SRS-COVERAGE.md`:

```markdown
# Kiểm responsive — 375 / 768 / 1440

Cách đo: mở trang, đặt bề rộng, chạy trong console
`document.documentElement.scrollWidth - window.innerWidth`. Kết quả `0` là đạt; lớn hơn 0 là tràn ngang.

| Trang | URL | 375 | 768 | 1440 | Ghi chú |
|---|---|---|---|---|---|
| Home | `/` | | | | |
| Markets | `/markets` | | | | |
| Market detail | `/markets/1` | | | | |
| Products | `/products` | | | | |
| Product detail | `/products/1` | | | | |
| Stall profile | `/stalls/1` | | | | |
| Search | `/search?q=rau` | | | | |
| Map | `/map` | | | | |
| About | `/about` | | | | |
| Contact | `/contact` | | | | |
| Feedback | `/feedback` | | | | |
| Customer dashboard | `/dashboard` | | | | |
| Cart | `/cart` | | | | |
| Orders | `/orders` | | | | |
| Order detail | `/orders/1` | | | | |
| Favorites | `/favorites` | | | | |
| Settings | `/settings` | | | | |
| Assistant | `/assistant` | | | | |
| Farmer overview | `/farmer` | | | | |
| Farmer orders | `/farmer/orders` | | | | |
| Farmer products | `/farmer/products` | | | | |
| Farmer stock | `/farmer/stock` | | | | |
| Farmer stall | `/farmer/stall` | | | | |
| Farmer slots | `/farmer/slots` | | | | |
| Admin dashboard | `/admin` | | | | |
| Admin farmers | `/admin/farmers` | | | | |
| Admin customers | `/admin/customers` | | | | |
| Admin markets | `/admin/markets` | | | | |
| Admin moderation | `/admin/moderation` | | | | |
| Admin reports | `/admin/reports` | | | | |
```

- [ ] **Step 2: Đo ở 375px, điền cột đầu (Review Focus #5)**

```bash
make up && make seed
```

Với mỗi URL: mở trong browser pane, `resize_window` preset `mobile` (375×812), rồi chạy

```js
document.documentElement.scrollWidth - window.innerWidth
```

Điền số vào cột `375`. Trang admin và farmer phải đăng nhập trước theo `docs/DEMO_CREDENTIALS.md` (mật khẩu chung `Demo@1234`).

Chú ý riêng các trang có `DataTable` — đó là nơi tràn ngang hay xảy ra nhất.

- [ ] **Step 3: Đo ở 768 và 1440, điền hai cột còn lại**

`resize_window` preset `tablet` (768×1024), rồi `{ width: 1440, height: 900 }`. Xong thì trả về `desktop`.

- [ ] **Step 4: Sửa từng trang có số lớn hơn 0**

Sửa theo thứ tự trong bảng. Hai khuôn sửa thường dùng:

Bảng rộng hơn màn — bọc vùng cuộn thay vì để nó đẩy trang:

```tsx
<div className="overflow-x-auto">
  <table className="min-w-160">…</table>
</div>
```

Ô flex hoặc grid không chịu co — mặc định `min-width: auto` giữ ô rộng bằng nội dung:

```tsx
<div className="flex min-w-0 flex-1 flex-col">…</div>
```

Sau mỗi lần sửa, đo lại đúng trang đó ở 375px và ghi `0` vào bảng.

- [ ] **Step 5: Gate + commit**

```bash
cd frontend && npx tsc -b && npx eslint src && npx vitest run
cd .. && git add frontend/src docs/submission/responsive-check.md
git commit -m "fix(FR-080): stop horizontal overflow at 375px

Measured scrollWidth against innerWidth on every page at 375, 768 and 1440.
The results table is in docs/submission/responsive-check.md."
```

- [ ] **Step 6: Mở PR gộp Task 1–4**

```bash
gh pr create --base dev --title "feat(FR-082, FR-023, FR-080): close the last SRS gaps before submission" --body "$(cat <<'EOF'
## What

- FR-082 — the About page names the six team members, credits Unsplash for the photos and states USD as the currency.
- FR-023 — /search gains category, price and market facets, matching what /products already had.
- FR-080 — horizontal overflow measured and fixed at 375 / 768 / 1440; results in docs/submission/responsive-check.md.
- Housekeeping — the `vnd` alias that formatted US dollars is gone.

## Why

These were the only lines of SRS §1.6 still open. docs/requirements/SRS-COVERAGE.md is now true end to end.

## Testing

`npx tsc -b && npx eslint src && npx vitest run` green. Checked by hand on `make up` + `make seed`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 5: Script đóng gói bài nộp

Repo làm việc chứa `CLAUDE.md`, `AGENTS.md`, `.ai/` và `docs/superpowers/` — 24 file kế hoạch triển khai do AI soạn. Rubric Plagiarism (10 điểm) ghi *"Check if code looks to be purely AI-generated"*. Đóng gói nguyên si là tự nộp bằng chứng.

Đồng thời SRS §1.9 quy định gói nộp phải gồm những gì. Làm một script để việc đóng gói lặp lại được và kiểm tra được, thay vì kéo thả bằng tay rồi quên mất một file.

Phần acknowledge AI trong `README.md` **giữ nguyên** — SRS trang 13 bắt buộc phải có.

**Files:**
- Create: `scripts/make-submission.sh`
- Create: `scripts/make-submission.test.sh`
- Modify: `Makefile` — thêm target `submission`

**Interfaces:**
- Consumes: cây thư mục repo ở `HEAD`.
- Produces: `dist/MarketLink-TechWiz7.zip`. Task 7 và Task 8 nói tới đúng tên file này.

- [ ] **Step 1: Viết test thất bại**

Tạo `scripts/make-submission.test.sh`:

```bash
#!/usr/bin/env bash
# Checks that the submission archive holds what the SRS asks for (§1.9) and none of the team's
# internal working files.
set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/make-submission.sh

ZIP=dist/MarketLink-TechWiz7.zip
fail=0

require() {
  if unzip -l "$ZIP" | grep -q "$1"; then
    echo "ok       $1"
  else
    echo "MISSING  $1"
    fail=1
  fi
}

refuse() {
  if unzip -l "$ZIP" | grep -q "$1"; then
    echo "LEAKED   $1"
    fail=1
  else
    echo "ok       no $1"
  fi
}

# SRS §1.9 — what the submission must carry
require 'db/schema.sql'
require 'db/seed.sql'
require 'docs/DEMO_CREDENTIALS.md'
require 'docs/ASSUMPTIONS.md'
require 'docs/setup.md'
require 'README.md'
require 'backend/src/main/java'
require 'frontend/src'

# Internal working files that must not travel with it
refuse 'docs/superpowers/'
refuse 'CLAUDE.md'
refuse 'AGENTS.md'
refuse '.ai/'
refuse 'node_modules/'
refuse '.git/'

exit $fail
```

```bash
chmod +x scripts/make-submission.test.sh
```

- [ ] **Step 2: Chạy test, xác nhận nó hỏng**

```bash
./scripts/make-submission.test.sh
```

Kỳ vọng: FAIL — `./scripts/make-submission.sh: No such file or directory`.

- [ ] **Step 3: Viết script đóng gói**

Tạo `scripts/make-submission.sh`:

```bash
#!/usr/bin/env bash
# Builds the archive handed to the judges (SRS §1.9). Exports a clean tree from HEAD, so nothing
# untracked and no build output can slip in, then drops the team's internal working files.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=dist
NAME=MarketLink-TechWiz7
STAGE="$OUT/$NAME"

rm -rf "$STAGE" "$OUT/$NAME.zip"
mkdir -p "$STAGE"

# From HEAD, not from the working tree: no node_modules, no .env, no half-finished edit.
git archive HEAD | tar -x -C "$STAGE"

# Internal working files. The AI acknowledgement stays in README.md — the SRS requires it (page 13);
# what goes is the day-to-day material that says nothing to a judge.
rm -rf \
  "$STAGE/docs/superpowers" \
  "$STAGE/docs/archive" \
  "$STAGE/docs/proposals" \
  "$STAGE/.ai" \
  "$STAGE/CLAUDE.md" \
  "$STAGE/AGENTS.md" \
  "$STAGE/frontend/CLAUDE.md" \
  "$STAGE/backend/CLAUDE.md" \
  "$STAGE/lefthook.yml" \
  "$STAGE/.github"

(cd "$OUT" && zip -qr "$NAME.zip" "$NAME")
rm -rf "$STAGE"

echo "Wrote $OUT/$NAME.zip ($(du -h "$OUT/$NAME.zip" | cut -f1))"
```

```bash
chmod +x scripts/make-submission.sh
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

```bash
./scripts/make-submission.test.sh
```

Kỳ vọng: mọi dòng bắt đầu bằng `ok`, exit code 0.

- [ ] **Step 5: Thêm target vào Makefile**

Thêm vào `Makefile`, cạnh các target khác:

```makefile
submission: ## Build the archive handed to the judges (dist/MarketLink-TechWiz7.zip)
	./scripts/make-submission.sh
	./scripts/make-submission.test.sh
```

- [ ] **Step 6: Bảo đảm `dist/` không vào git**

```bash
grep -q '^dist/$' .gitignore || echo 'dist/' >> .gitignore
```

- [ ] **Step 7: Commit**

```bash
git add scripts/make-submission.sh scripts/make-submission.test.sh Makefile .gitignore
git commit -m "chore: build the submission archive with a script, not by hand

git archive from HEAD so nothing untracked travels, then drop the team's
internal working files. A companion check asserts both halves."
```

---

## Task 6: Kiểm tra tương thích 4 trình duyệt

Rubric Compatibility là 5 điểm và nói thẳng: *"Test with at least 3 to 4 browsers: Firefox, Chrome, Edge, and Opera."* Năm điểm này gần như cho không nếu chịu mở đủ bốn trình duyệt và chụp màn hình.

**Files:**
- Create: `docs/submission/browser-check.md`
- Create: `docs/submission/screenshots/<browser>-<page>.png` (12 ảnh)

**Interfaces:**
- Consumes: ứng dụng đang chạy từ `make up`.
- Produces: `docs/submission/browser-check.md` và thư mục ảnh — cả hai đi vào Project Report (Task 7).

- [ ] **Step 1: Dựng khung bảng**

Tạo `docs/submission/browser-check.md`:

```markdown
# Kiểm tương thích trình duyệt

Ngày kiểm: ⟨điền⟩ · Bản: `dev` @ ⟨commit⟩ · Chạy tại `http://localhost:3000` (`make up` + `make seed`)

Ba màn đại diện cho ba vai và ba kiểu giao diện: trang public có bản đồ, luồng đặt đơn, bảng dữ liệu admin.

| Trình duyệt | Bản | `/markets` (bản đồ) | `/cart` (đặt đơn) | `/admin/farmers` (bảng) | Ghi chú |
|---|---|---|---|---|---|
| Chrome | | | | | |
| Firefox | | | | | |
| Edge | | | | | |
| Opera | | | | | |
```

- [ ] **Step 2: Kiểm từng trình duyệt**

Với mỗi trình duyệt, mở ba URL, và với mỗi URL kiểm ba điều:

1. Trang render đúng — bản đồ hiện ghim, giỏ tính được tiền, bảng hiện đủ dòng.
2. Console không có lỗi đỏ (`F12` → Console).
3. Chụp màn hình lưu vào `docs/submission/screenshots/<browser>-<page>.png`.

Điền `OK` hoặc mô tả lỗi vào ô tương ứng.

- [ ] **Step 3: Sửa nếu có lỗi riêng của một trình duyệt**

Lỗi hay gặp nhất với stack này là Safari/Firefox không hiểu một thuộc tính CSS mới. Nếu gặp, sửa ở `frontend/src`, ghi lý do vào cột Ghi chú, rồi đo lại cả bốn trình duyệt.

- [ ] **Step 4: Commit**

```bash
git add docs/submission
git commit -m "docs: record the browser compatibility check on four browsers"
```

---

## Task 7: Project Report — dàn ý và số liệu (SRS §1.9)

Đây là hạng mục **Documentation 10 điểm** và hiện chưa có gì. Đề liệt kê rõ nội dung bắt buộc: problem definition, design specifications, flowchart và DFD, database design, test data, installation instructions (MANDATORY), user credentials (MANDATORY), phân công task.

**Hai ràng buộc cứng của đề:**
- *"Do not use AI tools to fully produce ready-made documentation. This is strictly forbidden."* → phần chữ do người viết. Task này chỉ dựng dàn ý, trích số liệu có sẵn trong repo và liệt kê sơ đồ phải vẽ.
- *"Documentation should not contain any source code."* → không dán đoạn code nào, kể cả SQL. Sơ đồ, bảng và ảnh màn hình thì được.

**Files:**
- Create: `docs/submission/PROJECT-REPORT-OUTLINE.md`
- Create: `docs/submission/diagrams/` — nơi để 4 sơ đồ xuất ra PNG

**Interfaces:**
- Consumes: `MEMBERS` từ `frontend/src/pages/public/About/index.tsx` (Task 1) · `docs/requirements/SRS-COVERAGE.md` · `db/schema.sql` · `docs/submission/responsive-check.md` (Task 4) · `docs/submission/browser-check.md` (Task 6)
- Produces: dàn ý mà QA/DOC viết đầy thành file `.docx` nộp kèm.

- [ ] **Step 1: Trích số liệu thật từ repo**

```bash
echo "Bảng trong DB:"; grep -c "^CREATE TABLE" db/schema.sql
echo "Migration:";     ls backend/src/main/resources/db/migration/*.sql | wc -l
echo "Module backend:"; ls backend/src/main/java/com/techx/intervue/modules | tr '\n' ' '
echo "Endpoint:";      grep -rhoE "@(Get|Post|Put|Patch|Delete)Mapping" backend/src/main/java | wc -l
echo "Trang frontend:"; find frontend/src/pages -name index.tsx | wc -l
echo "Ngôn ngữ:";      ls frontend/src/locales | tr '\n' ' '
echo "Test frontend:"; cd frontend && npx vitest run 2>&1 | tail -3
```

Ghi kết quả vào Step 2 — báo cáo phải nói số thật, không ước lượng.

- [ ] **Step 2: Viết dàn ý**

Tạo `docs/submission/PROJECT-REPORT-OUTLINE.md`:

```markdown
# Project Report — dàn ý

> QA/DOC viết phần chữ. Dàn ý này chỉ nói mỗi mục cần gì và lấy số liệu ở đâu.
> Hai luật của đề: **không dán source code vào báo cáo**, và **không để AI viết thay phần chữ**.

## 1. Problem Definition
Lấy bối cảnh từ SRS §1.1: khách không biết trước hôm nay ai bán, còn hàng gì, giá bao nhiêu →
đi chợ về tay không; nhà vườn không có cách công bố hàng tuần hay nhận đặt trước.
Viết 2–3 đoạn bằng lời của đội. Nêu rõ ba thứ đề loại khỏi phạm vi (SRS §1.5): không cổng
thanh toán, không giao hàng, không xác minh giấy phép hay chứng nhận organic.

## 2. Design Specifications
- Ba vai và ranh giới quyền: `customer`, `farmer`, `admin`.
- Vòng đời đơn: `placed → accepted → ready → completed`, nhánh `declined` và `cancelled`.
- Quy tắc thời gian: operating days của chợ, pickup window của sạp, cutoff time, slot.
- Bảng liệt kê module ↔ vai: lấy từ `docs/requirements/MarketLink-Feature-Catalog-by-Module-and-Role.md`.

## 3. Sơ đồ (vẽ ra PNG, để trong docs/submission/diagrams/)
| Sơ đồ | Nội dung | Nguồn dựng |
|---|---|---|
| `flow-order.png` | Flowchart vòng đời đơn hàng, đủ 6 trạng thái và điều kiện cutoff | `docs/decisions.md` D-04, D-05, D-07 |
| `dfd-level0.png` | DFD mức 0 — Customer, Farmer, Admin ↔ MarketLink ↔ MySQL | SRS trang 7 |
| `dfd-level1.png` | DFD mức 1 — tách theo module: auth, catalog, order, review, notification | `backend/.../modules/` |
| `erd.png` | ERD đầy đủ, khoá chính và khoá ngoại | `db/schema.sql` |

## 4. Database Design
- Số bảng: ⟨từ Step 1⟩. Số migration Flyway: ⟨từ Step 1⟩.
- Bảng chính và quan hệ, dạng bảng chữ — **không dán câu CREATE TABLE**.
- Nói rõ chỗ đội **sửa khác gợi ý của đề**: đề để `product_id` nằm thẳng trong `Orders`
  (một đơn một sản phẩm), mâu thuẫn với yêu cầu giỏ hàng ở §1.6; đội tách `order_items`
  và thêm `order_status_history`. Đây là điểm đáng viết hẳn một đoạn — giám khảo sẽ hỏi.

## 5. Test Data
- Nội dung `make seed` sinh ra: 4 chợ toạ độ thật TP.HCM, 10 sạp đã duyệt, 51 sản phẩm,
  12 đơn rải đủ 6 trạng thái, trong đó 4 đơn `completed` để mở khoá review.
- Nguồn: `db/seed.sql`, mô tả sẵn ở `docs/DEMO_CREDENTIALS.md`.

## 6. Installation Instructions (MANDATORY)
Chép từ `README.md` §Quick start và `docs/setup.md`, rút thành các bước đánh số.
Ghi rõ yêu cầu máy: Docker Desktop, cổng 3000 / 8080 / 3306 phải rảnh.

## 7. User Credentials (MANDATORY)
Chép nguyên bảng ở `docs/DEMO_CREDENTIALS.md` — bốn tài khoản, mật khẩu chung `Demo@1234`,
kèm cột "đăng nhập ở đâu" vì admin vào `/admin/login` chứ không phải `/login`.

## 8. Tasks Allotted to Team
Sáu dòng, tên lấy từ `MEMBERS` trong `frontend/src/pages/public/About/index.tsx`,
phần việc lấy từ cột `Vai` và `Owner` trong `.ai/REQUIREMENTS.md`.

## 9. Testing
- Test tự động: ⟨số test frontend từ Step 1⟩ Vitest + backend `make be-test`.
- Responsive: bảng ở `docs/submission/responsive-check.md`.
- Tương thích: bảng ở `docs/submission/browser-check.md`, kèm 12 ảnh màn hình.

## 10. AI Tools Used
Chép từ `README.md` §"AI tools used". Đề bắt buộc phải khai (SRS trang 13).

## 11. Assumptions
Chép từ `docs/ASSUMPTIONS.md`. Bổ sung ba điều nếu chưa có:
- "Vendor" trong flow diagram của đề = "Farmer" trong ứng dụng; đội dùng một từ xuyên suốt.
- Farmer không đăng ký thành tài khoản riêng: đăng ký làm Customer rồi nộp hồ sơ ở `/become-farmer`.
  Năm trường đề yêu cầu (stall name, contact person, phone, email, address) đều được thu thập.
- Một tài khoản một người; đề để ngỏ việc chia sẻ tài khoản trong gia đình (optional), đội không làm.
```

- [ ] **Step 3: Vẽ bốn sơ đồ**

Vẽ bằng công cụ của đội (draw.io, Figma, Excalidraw), xuất PNG vào `docs/submission/diagrams/`. Tên file đúng như bảng ở mục 3.

Kiểm: mở từng PNG ở 100%, chữ phải đọc được; in ra giấy A4 vẫn phải đọc được.

- [ ] **Step 4: Commit dàn ý và sơ đồ**

```bash
git add docs/submission/PROJECT-REPORT-OUTLINE.md docs/submission/diagrams
git commit -m "docs: outline the project report and add the four diagrams"
```

- [ ] **Step 5: QA/DOC viết phần chữ**

Viết ra `.docx` theo dàn ý. Trước khi chốt, soát lại ba điều:

1. Không có đoạn code nào trong file — kể cả SQL và JSON.
2. Đủ hai mục MANDATORY: installation instructions và user credentials.
3. Mọi con số khớp với số thật lấy ở Step 1.

---

## Task 8: Video demo (SRS §1.9 — MANDATORY)

Đây là cách 35 điểm Functionality thật sự được chấm. Đề in đậm trên nền tím: *"Submit a video (.mp4 file) demonstrating the working of the Web application, including all features under Functional Requirements. This is MANDATORY."*

Đội đang có lợi thế hiếm: `docs/requirements/SRS-COVERAGE.md` đã là kịch bản sẵn — 44 dòng theo đúng thứ tự SRS §1.6, mỗi dòng có URL và ô ☐ "Đã quay". Giám khảo cầm SRS tick từng dòng; video đi đúng thứ tự đó thì họ không phải tìm, và không có gì để bỏ sót.

**Files:**
- Modify: `docs/requirements/SRS-COVERAGE.md` — tick cột "Đã quay"
- Create: `docs/submission/video-script.md`
- Create: `dist/MarketLink-demo.mp4` (không vào git)

**Interfaces:**
- Consumes: `docs/requirements/SRS-COVERAGE.md` (44 dòng) · `docs/DEMO_CREDENTIALS.md` (4 tài khoản)
- Produces: file `.mp4` và bảng timestamp đi kèm bài nộp.

- [ ] **Step 1: Dựng môi trường quay sạch**

```bash
make down
make up
make seed
```

Nạp lại seed để dữ liệu về đúng trạng thái đã mô tả: 12 đơn đủ 6 trạng thái, 4 đơn `completed` để quay được phần review. Đăng nhập sẵn ba tài khoản ở ba cửa sổ trình duyệt riêng để không mất thời gian chuyển vai giữa lúc quay.

- [ ] **Step 2: Viết kịch bản có timestamp**

Tạo `docs/submission/video-script.md`: chép 44 dòng của `SRS-COVERAGE.md` theo đúng thứ tự Customer → Farmer → Admin → Other, mỗi dòng thêm hai cột:

```markdown
| # | SRS §1.6 | FR | URL | Thao tác quay | Phút:giây |
|---|---|---|---|---|---|
| 1 | Register / log in / dashboard | 001, 003, 006 | `/register/customer` | Điền 4 trường, gửi, vào thẳng dashboard | |
| 2 | Name, phone, e-mail, address khi đăng ký | 001 | `/register/customer` | Zoom vào form cho thấy đủ 4 trường | |
…
```

Cột "Thao tác quay" phải cụ thể tới mức người quay không phải nghĩ. Ví dụ dòng cutoff: *"Ở `/orders/3`, chỉ vào dòng cutoff còn hiệu lực, bấm Edit, giảm số lượng, lưu; rồi mở `/orders/8` đã quá cutoff, chỉ nút Edit bị khoá."*

- [ ] **Step 3: Quay**

Quay từng khối một, không cố quay liền một mạch. Nguyên tắc:

- Độ phân giải 1920×1080, không thu nhỏ cửa sổ.
- Mỗi dòng SRS phải **thấy được kết quả**, không chỉ thấy cú bấm. Đặt đơn thì phải thấy màn xác nhận; duyệt Farmer thì phải thấy trạng thái đổi.
- Nói hoặc chèn chữ tên tính năng khi bắt đầu mỗi dòng, để giám khảo biết đang xem cái gì.
- Phần bản đồ: cho thấy ghim, bấm ghim ra popup, bấm Directions mở chỉ đường.
- Phần chatbot: hỏi hai câu khác nhau — một câu tìm sản phẩm, một câu hỏi giờ chợ.

- [ ] **Step 4: Ghép, điền timestamp, tick bảng**

Ghép thành một file `.mp4`. Xem lại từ đầu, điền cột "Phút:giây" vào `video-script.md`, và tick ☐ → ☑ ở cột "Đã quay" trong `docs/requirements/SRS-COVERAGE.md`.

**Không dòng nào được để trống.** Dòng nào chưa quay được thì quay bổ sung, không bỏ qua.

- [ ] **Step 5: Commit kịch bản và bảng đã tick**

```bash
git add docs/submission/video-script.md docs/requirements/SRS-COVERAGE.md
git commit -m "docs: video script with timestamps for every line of SRS 1.6"
```

- [ ] **Step 6: Đóng gói lần cuối**

```bash
make submission
```

Kiểm gói: `dist/MarketLink-TechWiz7.zip` mở ra phải có `db/*.sql`, `docs/DEMO_CREDENTIALS.md`, `docs/ASSUMPTIONS.md`, `README.md`, mã nguồn; **không** có `docs/superpowers/`, `CLAUDE.md`, `AGENTS.md`, `.ai/`.

Nộp kèm ngoài zip: Project Report (`.docx`), video (`.mp4`), và URL hosting nếu có.

---

## Phụ lục: việc tuỳ chọn, chỉ làm khi còn thời gian

Không thuộc bốn deliverable bắt buộc. Cắt đầu tiên nếu thiếu thời gian.

- **Hosting** — SRS ghi *"Preferably, host the working Web application on a Website and share the URL"*. Không bắt buộc nhưng là lợi thế rõ. Dùng `docker-compose.prod.yml` đã có sẵn.
- **Email thật cho order confirmation và ready-for-pickup** (`FR-043`, nhãn NICE) — `MailService` đã có, hiện chỉ dùng cho reset mật khẩu. Đề cho phép *"e-mail **or** in-app"*, mà in-app đã chạy, nên đây thuần là điểm cộng.
- **Sitemap trên trang chủ** (`FR-085`, nhãn NICE) — đề MarketLink không yêu cầu.
