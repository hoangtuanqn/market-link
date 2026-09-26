/**
 * Đơn vị bán mà Farmer chọn khi tạo sản phẩm (FR-062, FR-022). Danh sách cố định nằm trong code, không phải master data
 * của Admin: SRS chỉ giao cho Admin quản "product categories", và `db/schema.sql` cũng chỉ có `products.unit
 * VARCHAR(20)` chứ không có bảng units.
 *
 * `kind` để báo cáo không cộng nhầm: một ký và một bó không bao giờ cộng vào cùng một con số, nên số lượng chỉ được
 * tổng hợp trong cùng một loại.
 */
export type UnitKind = 'weight' | 'volume' | 'count' | 'pack';

export type UnitOption = {
  /** Giá trị lưu vào `products.unit`, cũng là số ít khi hiển thị. */
  one: string;
  /** Dạng số nhiều — tiếng Anh không suy ra được bằng quy tắc nên viết sẵn. */
  many: string;
  kind: UnitKind;
};

/**
 * Chọn lại 2026-09-26: bộ đơn vị phổ biến, chuẩn cho một chợ nông sản — bỏ các đơn vị quá hẹp (bulb, jar, bottle, loaf,
 * "tray of 30") để form gọn và dễ đoán hơn.
 */
export const UNITS: UnitOption[] = [
  { one: 'kg', many: 'kg', kind: 'weight' },
  { one: 'g', many: 'g', kind: 'weight' },
  { one: 'litre', many: 'litres', kind: 'volume' },
  { one: 'bunch', many: 'bunches', kind: 'count' },
  { one: 'piece', many: 'pieces', kind: 'count' },
  { one: 'dozen', many: 'dozen', kind: 'count' },
  { one: 'bag', many: 'bags', kind: 'pack' },
  { one: 'box', many: 'boxes', kind: 'pack' },
];

export const UNIT_KINDS: UnitKind[] = ['weight', 'volume', 'count', 'pack'];

/** Dạng số nhiều của một đơn vị đã biết; đơn vị lạ thì trả lại chính nó. */
export const pluralOf = (one: string) => UNITS.find((u) => u.one === one)?.many ?? one;
