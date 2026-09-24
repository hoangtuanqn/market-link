-- ============================================================================
-- MarketLink — schema.sql
-- TechWiz 7 · End-to-End Web Solutions
-- MySQL 8.0+ · charset utf8mb4 (bắt buộc, vì có tiếng Việt có dấu)
--
-- CHỦ SỞ HỮU: LEAD. Không ai khác được sửa file này (CLAUDE.md R-02).
-- Chạy được từ database RỖNG, không phụ thuộc thứ tự thủ công.
--
-- 19 bảng. Đã vá 2 lỗ hổng trong schema gợi ý của đề:
--   1. Đề để product_id thẳng trong Orders -> không làm được giỏ hàng.
--      Đã tách thành orders + order_items.
--   2. Đề để Reviews chỉ có product_id -> không review được Farmer.
--      Đã thêm target_type + farmer_id.
-- ============================================================================

DROP DATABASE IF EXISTS marketlink;
CREATE DATABASE marketlink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE marketlink;

-- ---------------------------------------------------------------------------
-- 1. NGƯỜI DÙNG & PHÂN QUYỀN
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('customer','farmer','admin') NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  address        VARCHAR(255) NULL,          -- bắt buộc với customer khi đăng ký
  status         ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  token_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token       VARCHAR(255) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. FARMER
-- ---------------------------------------------------------------------------

CREATE TABLE farmer_profiles (
  farmer_id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE,
  stall_name          VARCHAR(120) NOT NULL,
  contact_person      VARCHAR(100) NOT NULL,
  description         TEXT NULL,
  logo_url            VARCHAR(255) NULL,
  -- D-02/D-05: Farmer tự đặt số giờ cutoff trước giờ pickup
  order_cutoff_hours  INT NOT NULL DEFAULT 12,
  -- D-09: Farmer phải được admin duyệt mới được bán
  approval_status     ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  approved_by         INT NULL,
  approved_at         DATETIME NULL,
  reject_reason       VARCHAR(255) NULL,
  rating_avg          DECIMAL(3,2) NOT NULL DEFAULT 0.00,   -- cache, tính lại khi có review
  rating_count        INT NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_farmer_approval (approval_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. CHỢ & ĐỊA ĐIỂM
-- ---------------------------------------------------------------------------

CREATE TABLE markets (
  market_id     INT AUTO_INCREMENT PRIMARY KEY,
  market_name   VARCHAR(150) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  district      VARCHAR(100) NULL,
  city          VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
  latitude      DECIMAL(10,8) NOT NULL,
  longitude     DECIMAL(11,8) NOT NULL,
  map_provider  VARCHAR(30) NOT NULL DEFAULT 'osm',   -- D-12
  opening_time  TIME NOT NULL,
  closing_time  TIME NOT NULL,
  image_url     VARCHAR(255) NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_markets_city_active (city, is_active)
) ENGINE=InnoDB;

-- Chợ họp vào những thứ mấy trong tuần (0=CN ... 6=T7)
CREATE TABLE market_operating_days (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  market_id    INT NOT NULL,
  day_of_week  TINYINT NOT NULL,
  FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE,
  UNIQUE KEY uq_market_day (market_id, day_of_week),
  CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB;

-- Quan hệ nhiều-nhiều: một Farmer bán ở nhiều chợ, một chợ có nhiều Farmer.
-- Đề ghi "the markets they sell at" (số nhiều) — schema gợi ý của đề thiếu bảng này.
CREATE TABLE farmer_markets (
  farmer_market_id  INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id         INT NOT NULL,
  market_id         INT NOT NULL,
  stall_code        VARCHAR(30) NULL,          -- số quầy, ví dụ "A-12"
  stall_latitude    DECIMAL(10,8) NULL,        -- vị trí quầy, có thể lệch tâm chợ
  stall_longitude   DECIMAL(11,8) NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE,
  UNIQUE KEY uq_farmer_market (farmer_id, market_id)
) ENGINE=InnoDB;

-- Khung giờ nhận hàng của Farmer tại từng chợ, theo từng thứ trong tuần
CREATE TABLE farmer_operating_days (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  farmer_market_id  INT NOT NULL,
  day_of_week       TINYINT NOT NULL,
  pickup_start_time TIME NOT NULL,
  pickup_end_time   TIME NOT NULL,
  FOREIGN KEY (farmer_market_id) REFERENCES farmer_markets(farmer_market_id) ON DELETE CASCADE,
  UNIQUE KEY uq_fm_day (farmer_market_id, day_of_week),
  CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB;

-- Slot cụ thể theo ngày. D-06: mỗi slot có giới hạn số đơn.
CREATE TABLE pickup_slots (
  slot_id           INT AUTO_INCREMENT PRIMARY KEY,
  farmer_market_id  INT NOT NULL,
  slot_date         DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  max_orders        INT NOT NULL DEFAULT 5,
  booked_count      INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (farmer_market_id) REFERENCES farmer_markets(farmer_market_id) ON DELETE CASCADE,
  UNIQUE KEY uq_slot (farmer_market_id, slot_date, start_time),
  INDEX idx_slot_date (slot_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. SẢN PHẨM & TỒN KHO
-- ---------------------------------------------------------------------------

-- Master data do admin quản (FR admin: "manage master data such as product categories")
CREATE TABLE categories (
  category_id  INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(80) NOT NULL UNIQUE,
  slug         VARCHAR(80) NOT NULL UNIQUE,
  description  VARCHAR(255) NULL,
  icon         VARCHAR(50) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE products (
  product_id      INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id       INT NOT NULL,
  category_id     INT NOT NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT NULL,
  price           DECIMAL(10,2) NOT NULL,
  unit            VARCHAR(20) NOT NULL,              -- kg, bó, quả, hộp...
  stock_quantity  INT NOT NULL DEFAULT 0,
  image_url       VARCHAR(255) NULL,
  status          ENUM('available','sold_out','unavailable') NOT NULL DEFAULT 'available',
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,    -- xoá mềm: đơn cũ vẫn tham chiếu được
  rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count    INT NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(category_id),
  INDEX idx_products_farmer (farmer_id, status),
  INDEX idx_products_category (category_id, status),
  CHECK (price >= 0),
  CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

-- FR Farmer: "set up a recurring weekly stock template"
CREATE TABLE weekly_stock_templates (
  template_id       INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id         INT NOT NULL,
  product_id        INT NOT NULL,
  day_of_week       TINYINT NOT NULL,
  default_quantity  INT NOT NULL,
  default_price     DECIMAL(10,2) NULL,   -- null = dùng giá hiện tại của product
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (farmer_id)  REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  UNIQUE KEY uq_template (product_id, day_of_week),
  CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 5. ĐƠN HÀNG  ⭐ lõi hệ thống
-- ---------------------------------------------------------------------------

-- D-01: một đơn = một Farmer = một chợ = một slot.
CREATE TABLE orders (
  order_id      INT AUTO_INCREMENT PRIMARY KEY,
  order_code    VARCHAR(20) NOT NULL UNIQUE,        -- ML-20260924-0001
  customer_id   INT NOT NULL,
  farmer_id     INT NOT NULL,
  market_id     INT NOT NULL,
  slot_id       INT NULL,
  pickup_date   DATE NOT NULL,
  pickup_start  TIME NOT NULL,
  pickup_end    TIME NOT NULL,
  cutoff_at     DATETIME NOT NULL,                  -- D-05
  total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  status        ENUM('placed','accepted','declined','ready','completed','cancelled')
                NOT NULL DEFAULT 'placed',          -- D-04
  customer_note VARCHAR(255) NULL,
  farmer_note   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id),
  FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles(farmer_id),
  FOREIGN KEY (market_id)   REFERENCES markets(market_id),
  FOREIGN KEY (slot_id)     REFERENCES pickup_slots(slot_id) ON DELETE SET NULL,
  INDEX idx_orders_customer (customer_id, status),
  INDEX idx_orders_farmer (farmer_id, status),
  INDEX idx_orders_pickup (pickup_date)
) ENGINE=InnoDB;

-- BẢNG ĐỀ GỢI Ý THIẾU. Không có bảng này thì không có giỏ hàng.
-- Snapshot tên + giá tại thời điểm đặt: Farmer đổi giá sau đó thì đơn cũ không đổi theo.
CREATE TABLE order_items (
  order_item_id  INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  product_id     INT NOT NULL,
  product_name   VARCHAR(150) NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  unit           VARCHAR(20) NOT NULL,
  quantity       INT NOT NULL,
  subtotal       DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  INDEX idx_items_order (order_id),
  CHECK (quantity > 0)
) ENGINE=InnoDB;

-- Mọi lần đổi trạng thái đều ghi lại (D-04)
CREATE TABLE order_status_history (
  history_id   INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  from_status  VARCHAR(20) NULL,
  to_status    VARCHAR(20) NOT NULL,
  changed_by   INT NULL,
  note         VARCHAR(255) NULL,
  changed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_history_order (order_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 6. ĐÁNH GIÁ
-- ---------------------------------------------------------------------------

-- D-10: một bảng, hai loại đối tượng. Chỉ tạo được khi order đã 'completed'.
CREATE TABLE reviews (
  review_id    INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT NOT NULL,
  order_id     INT NOT NULL,
  target_type  ENUM('product','farmer') NOT NULL,
  product_id   INT NULL,
  farmer_id    INT NULL,
  rating       TINYINT NOT NULL,
  comment      TEXT NULL,
  status       ENUM('visible','hidden') NOT NULL DEFAULT 'visible',  -- admin kiểm duyệt
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (order_id)    REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
  UNIQUE KEY uq_review (order_id, target_type, product_id, farmer_id),
  INDEX idx_reviews_product (product_id, status),
  INDEX idx_reviews_farmer (farmer_id, status),
  CHECK (rating BETWEEN 1 AND 5),
  CHECK ((target_type='product' AND product_id IS NOT NULL)
      OR (target_type='farmer'  AND farmer_id  IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE review_responses (
  response_id    INT AUTO_INCREMENT PRIMARY KEY,
  review_id      INT NOT NULL UNIQUE,
  farmer_id      INT NOT NULL,
  response_text  TEXT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. YÊU THÍCH, THÔNG BÁO, THÔNG CÁO
-- ---------------------------------------------------------------------------

CREATE TABLE favorites (
  favorite_id  INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT NOT NULL,
  target_type  ENUM('farmer','product','market') NOT NULL,
  farmer_id    INT NULL,
  product_id   INT NULL,
  market_id    INT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id)   REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (market_id)   REFERENCES markets(market_id) ON DELETE CASCADE,
  UNIQUE KEY uq_fav (customer_id, target_type, farmer_id, product_id, market_id)
) ENGINE=InnoDB;

-- D-11: in-app trước, email là NICE
CREATE TABLE notifications (
  notification_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  type             ENUM('order_accepted','order_declined','order_ready',
                        'order_cancelled','restock','announcement') NOT NULL,
  title            VARCHAR(150) NOT NULL,
  message          VARCHAR(500) NOT NULL,
  order_id         INT NULL,
  product_id       INT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

CREATE TABLE announcements (
  announcement_id  INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(150) NOT NULL,
  content          TEXT NOT NULL,
  created_by       INT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at        DATETIME NULL,
  ends_at          DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 8. GÓP Ý & CHATBOT (chatbot là optional theo đề)
-- ---------------------------------------------------------------------------

CREATE TABLE feedbacks (
  feedback_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NULL,                     -- null = khách vãng lai
  type         ENUM('bug','suggestion','query') NOT NULL,
  message      TEXT NOT NULL,
  status       ENUM('new','reviewed','resolved') NOT NULL DEFAULT 'new',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE chat_messages (
  message_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NULL,
  session_key  VARCHAR(64) NOT NULL,         -- để khách chưa đăng nhập vẫn có ngữ cảnh
  role         ENUM('user','bot') NOT NULL,
  message      TEXT NOT NULL,
  intent       VARCHAR(50) NULL,             -- intent đã nhận diện, để giải thích với giám khảo
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_chat_session (session_key, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- Tổng: 19 bảng.
-- Chuyển sang SQL Server: đổi AUTO_INCREMENT -> IDENTITY(1,1),
--   ENUM -> VARCHAR + CHECK, DATETIME DEFAULT CURRENT_TIMESTAMP -> GETDATE(),
--   bỏ ENGINE=InnoDB.
-- Chuyển sang MongoDB: gộp order_items vào document orders, giữ nguyên phần còn lại.
-- ============================================================================
