#!/usr/bin/env node
/**
 * Generates db/seed-extended.sql with massive realistic data:
 * - 100+ customers, 20+ farmers, 2 admins
 * - 500+ orders across 6 months
 * - Hundreds of reviews, chat messages, feedback, notifications
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'db', 'seed-extended.sql');

// --- Helpers ---
const esc = s => s.replace(/'/g, "''");
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rnd(0, arr.length - 1)];
const shuffle = arr => arr.sort(() => Math.random() - 0.5);

// Vietnamese name parts
const ho = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Cao','Trịnh','Đinh','Lương','Mai','Tô','Châu','Tạ','Từ'];
const dem = ['Văn','Thị','Đức','Minh','Thanh','Hữu','Quốc','Ngọc','Hoàng','Xuân','Kim','Bảo','Phương','Anh','Tuấn'];
const ten_nam = ['An','Bình','Cường','Đạt','Em','Phúc','Gia','Hào','Khang','Lâm','Minh','Nam','Phong','Quang','Sơn','Thắng','Trung','Vinh','Huy','Dũng','Tài','Kiệt','Long','Toàn','Hiếu'];
const ten_nu = ['Anh','Bích','Chi','Diễm','Hà','Hương','Lan','Mai','Ngọc','Phượng','Quyên','Trang','Uyên','Vân','Yến','Thảo','Linh','Nhung','Hoa','Trinh','Tuyết','Hiền','Oanh','Thuỷ','My'];

const districts = ['Quận 1','Quận 3','Quận 5','Quận 7','Quận 10','Bình Thạnh','Phú Nhuận','Tân Bình','Gò Vấp','TP. Thủ Đức','Tân Phú','Bình Tân'];
const streets = ['Nguyễn Huệ','Lê Lợi','Hai Bà Trưng','Pasteur','Điện Biên Phủ','Võ Văn Tần','Cách Mạng Tháng 8','Phan Đình Phùng','Nguyễn Văn Trỗi','Lý Tự Trọng','Trần Hưng Đạo','Lê Duẩn','Nguyễn Đình Chiểu','Sương Nguyệt Ánh','Bùi Viện','Nam Kỳ Khởi Nghĩa','Nguyễn Thị Minh Khai','Trương Định','Lê Văn Sỹ','Hoàng Sa'];

function vietName(gender) {
  const h = pick(ho);
  const d = gender === 'f' ? 'Thị' : pick(dem);
  const t = gender === 'f' ? pick(ten_nu) : pick(ten_nam);
  return `${h} ${d} ${t}`;
}

function vietAddress() {
  return `${rnd(1,200)} ${pick(streets)}, ${pick(districts)}`;
}

// --- Markets (existing) ---
const markets = ['Chợ Bà Chiểu', 'Chợ Thảo Điền', 'Chợ Bến Thành', 'Chợ Tân Định'];

// Farmer-market mapping from base seed
const farmerMarkets = {
  'farmer@marketlink.vn': ['Chợ Bà Chiểu', 'Chợ Thảo Điền'],
  'farmer2@marketlink.vn': ['Chợ Bến Thành', 'Chợ Tân Định'],
  'farmer3@marketlink.vn': ['Chợ Thảo Điền'],
  'farmer4@marketlink.vn': ['Chợ Bà Chiểu', 'Chợ Bến Thành'],
  'farmer5@marketlink.vn': ['Chợ Tân Định'],
  'farmer6@marketlink.vn': ['Chợ Thảo Điền', 'Chợ Bến Thành'],
  'farmer7@marketlink.vn': ['Chợ Bà Chiểu'],
  'farmer8@marketlink.vn': ['Chợ Tân Định', 'Chợ Bà Chiểu'],
  'farmer9@marketlink.vn': ['Chợ Thảo Điền'],
  'farmer10@marketlink.vn': ['Chợ Bến Thành', 'Chợ Tân Định'],
};

// Additional farmers (11-25)
const newFarmerStalls = [
  { n: 11, name: 'Vườn rau Tân Phú', desc: 'Rau xanh hữu cơ trồng tại vườn nhà Tân Phú, thu hoạch sáng sớm.', cat: 'vegetables', mkts: ['Chợ Bà Chiểu','Chợ Bến Thành'], cutoff: 12 },
  { n: 12, name: 'Trái cây Cần Thơ', desc: 'Trái cây miền Tây tươi mỗi ngày: mận, chôm chôm, nhãn, măng cụt.', cat: 'fruits', mkts: ['Chợ Thảo Điền','Chợ Tân Định'], cutoff: 24 },
  { n: 13, name: 'Hải sản Phan Thiết', desc: 'Tôm, cá, mực tươi sống từ Phan Thiết, đánh bắt đêm giao sáng.', cat: 'seafood', mkts: ['Chợ Bến Thành'], cutoff: 6 },
  { n: 14, name: 'Gà vịt Bình Dương', desc: 'Gà ta thả vườn, vịt cỏ, thịt tươi mỗi sáng.', cat: 'meat_and_poultry', mkts: ['Chợ Bà Chiểu','Chợ Tân Định'], cutoff: 12 },
  { n: 15, name: 'Đậu hạt Đắk Lắk', desc: 'Đậu phộng, hạt điều, cà phê rang xay Đắk Lắk chính gốc.', cat: 'grains_beans_and_nuts', mkts: ['Chợ Bến Thành','Chợ Thảo Điền'], cutoff: 48 },
  { n: 16, name: 'Bánh ngọt Sài Gòn', desc: 'Bánh flan, chè, bánh plan caramel tự làm từ nguyên liệu sạch.', cat: 'baked_goods', mkts: ['Chợ Tân Định','Chợ Bà Chiểu'], cutoff: 12 },
  { n: 17, name: 'Nấm Lâm Đồng', desc: 'Nấm linh chi, nấm hương, nấm đùi gà từ Lâm Đồng.', cat: 'mushrooms', mkts: ['Chợ Thảo Điền'], cutoff: 24 },
  { n: 18, name: 'Rau Đà Lạt Xanh', desc: 'Rau cải, súp lơ, atiso từ Đà Lạt, xe lạnh mỗi đêm.', cat: 'vegetables', mkts: ['Chợ Bến Thành','Chợ Bà Chiểu'], cutoff: 24 },
  { n: 19, name: 'Sữa dê Long An', desc: 'Sữa dê tươi, sữa chua dê, phô mai dê nhà làm.', cat: 'eggs_and_dairy', mkts: ['Chợ Tân Định'], cutoff: 12 },
  { n: 20, name: 'Cá khô Châu Đốc', desc: 'Khô cá lóc, khô cá sặc, mắm Châu Đốc truyền thống.', cat: 'seafood', mkts: ['Chợ Bến Thành','Chợ Thảo Điền'], cutoff: 48 },
];

// New products for new farmers
const newProducts = {
  11: [
    { name: 'Rau cải bó xôi', desc: 'Cải bó xôi hữu cơ, lá non.', price: 25000, unit: 'bunch', stock: 40 },
    { name: 'Rau xà lách Iceberg', desc: 'Xà lách giòn, trồng sạch.', price: 18000, unit: 'kg', stock: 35 },
    { name: 'Cải thìa', desc: 'Cải thìa baby, nấu canh ngọt.', price: 15000, unit: 'bunch', stock: 50 },
    { name: 'Rau má', desc: 'Rau má tươi, xay sinh tố.', price: 12000, unit: 'bunch', stock: 30 },
  ],
  12: [
    { name: 'Chôm chôm', desc: 'Chôm chôm nhãn Bến Tre, ngọt lịm.', price: 35000, unit: 'kg', stock: 60 },
    { name: 'Mận An Phước', desc: 'Mận hồng đào, giòn ngọt.', price: 40000, unit: 'kg', stock: 25 },
    { name: 'Nhãn lồng', desc: 'Nhãn lồng Hưng Yên cơm dày.', price: 55000, unit: 'kg', stock: 30 },
    { name: 'Măng cụt', desc: 'Măng cụt Lái Thiêu tím đậm.', price: 65000, unit: 'kg', stock: 20 },
    { name: 'Vú sữa', desc: 'Vú sữa Lò Rèn Vĩnh Kim.', price: 45000, unit: 'kg', stock: 15 },
  ],
  13: [
    { name: 'Tôm sú', desc: 'Tôm sú biển tươi sống, size 20 con/kg.', price: 280000, unit: 'kg', stock: 20 },
    { name: 'Cá thu', desc: 'Cá thu một nắng Phan Thiết.', price: 180000, unit: 'kg', stock: 15 },
    { name: 'Mực ống', desc: 'Mực ống tươi, đánh bắt đêm.', price: 220000, unit: 'kg', stock: 10 },
    { name: 'Nghêu', desc: 'Nghêu lụa Bến Tre, sạch cát.', price: 45000, unit: 'kg', stock: 40 },
  ],
  14: [
    { name: 'Gà ta nguyên con', desc: 'Gà ta thả vườn 1.5–2 kg.', price: 160000, unit: 'kg', stock: 15 },
    { name: 'Vịt cỏ', desc: 'Vịt cỏ nuôi đồng, thịt chắc.', price: 120000, unit: 'kg', stock: 10 },
    { name: 'Ức gà', desc: 'Ức gà lọc xương, đóng gói sạch.', price: 95000, unit: 'kg', stock: 25 },
    { name: 'Trứng gà ta', desc: 'Trứng gà ta thả vườn Bình Dương.', price: 50000, unit: 'tray of 30', stock: 30 },
  ],
  15: [
    { name: 'Đậu phộng rang', desc: 'Đậu phộng rang tỏi ớt, giòn rụm.', price: 60000, unit: 'kg', stock: 30 },
    { name: 'Hạt điều rang muối', desc: 'Hạt điều Bình Phước A+, rang muối.', price: 220000, unit: 'kg', stock: 15 },
    { name: 'Cà phê rang xay', desc: 'Cà phê Robusta Đắk Lắk, rang mộc.', price: 150000, unit: 'kg', stock: 20 },
    { name: 'Gạo ST25', desc: 'Gạo ST25 Sóc Trăng, thơm dẻo.', price: 35000, unit: 'kg', stock: 50 },
    { name: 'Đậu đen', desc: 'Đậu đen xanh lòng, nấu chè.', price: 40000, unit: 'kg', stock: 25 },
  ],
  16: [
    { name: 'Bánh flan caramel', desc: 'Bánh flan mềm mịn, caramel đắng nhẹ.', price: 15000, unit: 'jar', stock: 40 },
    { name: 'Chè khúc bạch', desc: 'Chè khúc bạch vải thiều.', price: 20000, unit: 'jar', stock: 30 },
    { name: 'Bánh tiramisu hộp', desc: 'Tiramisu cà phê, hộp 2 người.', price: 85000, unit: 'jar', stock: 12 },
    { name: 'Cookies socola', desc: 'Cookies socola chip, bơ thật.', price: 65000, unit: 'jar', stock: 20 },
  ],
  17: [
    { name: 'Nấm linh chi đỏ', desc: 'Nấm linh chi đỏ Lâm Đồng sấy khô.', price: 350000, unit: 'kg', stock: 8 },
    { name: 'Nấm hương khô', desc: 'Nấm hương rừng Lâm Đồng.', price: 280000, unit: 'kg', stock: 10 },
    { name: 'Nấm đùi gà', desc: 'Nấm đùi gà tươi, thịt chắc.', price: 55000, unit: 'kg', stock: 25 },
  ],
  18: [
    { name: 'Súp lơ trắng', desc: 'Súp lơ trắng Đà Lạt, bông to.', price: 30000, unit: 'kg', stock: 30 },
    { name: 'Atiso', desc: 'Atiso tươi Đà Lạt, nấu canh.', price: 45000, unit: 'kg', stock: 20 },
    { name: 'Bắp cải tím', desc: 'Bắp cải tím Đà Lạt, làm salad.', price: 25000, unit: 'kg', stock: 25 },
    { name: 'Cà rốt baby', desc: 'Cà rốt baby Đà Lạt, ăn sống.', price: 35000, unit: 'kg', stock: 40 },
    { name: 'Đậu Hà Lan', desc: 'Đậu Hà Lan tươi, bóc vỏ.', price: 50000, unit: 'kg', stock: 15 },
  ],
  19: [
    { name: 'Sữa dê tươi', desc: 'Sữa dê tươi thanh trùng Long An.', price: 65000, unit: 'litre', stock: 20 },
    { name: 'Sữa chua dê', desc: 'Sữa chua dê nhà làm, hũ 120ml.', price: 18000, unit: 'jar', stock: 50 },
    { name: 'Phô mai dê', desc: 'Phô mai dê soft, hộp 200g.', price: 120000, unit: 'jar', stock: 10 },
  ],
  20: [
    { name: 'Khô cá lóc', desc: 'Khô cá lóc Châu Đốc, phơi nắng.', price: 200000, unit: 'kg', stock: 15 },
    { name: 'Khô cá sặc', desc: 'Khô cá sặc bướm An Giang.', price: 180000, unit: 'kg', stock: 12 },
    { name: 'Mắm cá linh', desc: 'Mắm cá linh truyền thống.', price: 80000, unit: 'litre', stock: 20 },
    { name: 'Tôm khô', desc: 'Tôm khô loại 1 Cà Mau.', price: 350000, unit: 'kg', stock: 8 },
  ],
};

// Review comments
const productReviews = [
  'Sản phẩm tươi ngon, đóng gói cẩn thận. Rất hài lòng!',
  'Chất lượng ổn, giá hợp lý. Sẽ mua lại.',
  'Hàng tươi, giao đúng hẹn, cảm ơn sạp nhiều.',
  'Chất lượng tạm ổn, lần sau hy vọng tươi hơn.',
  'Rau rất tươi, đúng như mô tả. 10 điểm!',
  'Hàng ngon, đóng gói sạch sẽ.',
  'Sản phẩm chất lượng, giá cả phải chăng.',
  'Tốt lắm, sẽ quay lại mua tiếp.',
  'Tươi xanh, ăn rất ngon. Cảm ơn chủ sạp!',
  'Giá hơi cao nhưng chất lượng xứng đáng.',
  'Lần đầu mua thử, không thất vọng.',
  'Đặt lần 3 rồi, lần nào cũng tốt.',
  'Hàng đẹp, tươi, giao nhanh.',
  'So với siêu thị thì tươi hơn nhiều.',
  'Mình rất thích, sẽ giới thiệu bạn bè.',
];

const stallReviews = [
  'Sạp rất thân thiện, hàng sạch, sẽ ủng hộ dài dài.',
  'Nhận hàng nhanh, sạp chuyên nghiệp.',
  'Chủ sạp nhiệt tình, hàng luôn tươi.',
  'Hơi đợi lâu nhưng hàng tốt.',
  'Sạp gọn gàng, hàng đúng như hình.',
  'Rất hài lòng với sạp này!',
  'Sạp bán đúng giá, không chặt chém.',
  'Phục vụ nhanh, thái độ vui vẻ.',
  'Lần nào cũng đúng hẹn, tin tưởng.',
  'Chất lượng ổn định, mua hoài không chán.',
];

const farmerResponses = [
  'Cảm ơn quý khách đã ủng hộ! Tuần sau sạp có thêm hàng mới nhé.',
  'Dạ cảm ơn, sạp sẽ cố gắng phục vụ tốt hơn ạ!',
  'Cảm ơn bạn nhiều, hẹn gặp lại tuần sau!',
  'Xin cảm ơn đánh giá, sạp rất trân trọng!',
  'Dạ sạp ghi nhận, sẽ cải thiện ạ. Cảm ơn bạn!',
  'Cảm ơn bạn đã tin tưởng sạp nhà mình!',
];

const chatQuestions = [
  ['Chợ nào gần Quận 1 nhất?', 'market_search', 'Chợ Bến Thành ở Lê Lợi, Quận 1 là gần nhất, mở cửa 06:00-19:00.'],
  ['Có bán trái cây không?', 'product_search', 'Có! Sạp Trái cây Ba Tơ bán bưởi, cam sành, xoài tại Chợ Bến Thành.'],
  ['Tôi muốn mua rau muống', 'product_search', 'Sạp Vườn Út Hiền ở Chợ Bà Chiểu bán rau muống, giá 12,000d/bó.'],
  ['Cách huỷ đơn hàng?', 'order_help', 'Vào Đơn hàng, chọn đơn muốn huỷ, bấm Huỷ đơn. Chỉ huỷ trước giờ cutoff.'],
  ['Nấm bào ngư ở đâu?', 'product_search', 'Sạp Nấm sạch Thu Thảo ở Chợ Thảo Điền, giá 40,000d/kg.'],
  ['Giờ mở cửa Chợ Thảo Điền?', 'market_info', 'Chợ Thảo Điền mở 06:00-20:00, chỉ Thứ bảy và Chủ nhật.'],
  ['Sạp nào bán mật ong?', 'product_search', 'Sạp Mật ong U Minh bán mật ong rừng tràm 250,000d/lít.'],
  ['Có giao hàng không?', 'general', 'MarketLink chỉ hỗ trợ đặt trước và nhận tại sạp, chưa có giao hàng.'],
  ['Làm sao tạo tài khoản farmer?', 'account_help', 'Vào Tài khoản → Đăng ký bán hàng, điền thông tin sạp chờ admin duyệt.'],
  ['Đơn bị từ chối có được hoàn tiền?', 'order_help', 'Đơn bị từ chối sẽ không bị trừ tiền vì MarketLink tính tiền khi nhận hàng.'],
  ['Có thể đổi giờ nhận hàng?', 'order_help', 'Bạn cần huỷ đơn cũ và đặt lại đơn mới với khung giờ khác.'],
  ['Sạp nào bán hải sản?', 'product_search', 'Sạp Hải sản Phan Thiết và Cá khô Châu Đốc bán tại Chợ Bến Thành.'],
  ['Chợ Bến Thành bán gì?', 'market_info', 'Chợ Bến Thành có nhiều sạp: trái cây, rau củ, hải sản, bánh ngọt...'],
  ['Tôi muốn mua gà ta', 'product_search', 'Sạp Gà vịt Bình Dương bán gà ta nguyên con 160,000d/kg tại Chợ Bà Chiểu.'],
  ['Thanh toán bằng gì?', 'general', 'Hiện tại thanh toán trực tiếp tại sạp khi nhận hàng.'],
  ['Có ưu đãi gì cho khách mới?', 'general', 'Bạn xem mục Thông báo trên app để cập nhật các ưu đãi mới nhất.'],
  ['Rau hữu cơ ở sạp nào?', 'product_search', 'Sạp Vườn rau Tân Phú và Rau Đà Lạt Xanh bán rau hữu cơ.'],
  ['Đậu phộng rang ở đâu?', 'product_search', 'Sạp Đậu hạt Đắk Lắk bán đậu phộng rang tỏi ớt, 60,000d/kg.'],
];

const feedbackMessages = [
  ['bug', 'Trang giỏ hàng không hiện badge số lượng trên điện thoại Samsung.', 'resolved'],
  ['suggestion', 'Cho phép lọc sản phẩm theo khoảng cách từ vị trí hiện tại.', 'reviewed'],
  ['query', 'Tôi muốn đăng ký bán hàng trên MarketLink, cần điều kiện gì?', 'resolved'],
  ['bug', 'Nút Thêm vào yêu thích bị lỗi trên Firefox khi bấm nhanh liên tục.', 'resolved'],
  ['suggestion', 'Thêm tính năng so sánh giá giữa các sạp cho cùng một sản phẩm.', 'new'],
  ['query', 'Đơn hàng bị từ chối thì có bị trừ tiền không?', 'resolved'],
  ['bug', 'Bản đồ chợ load chậm khi mở trên 3G.', 'reviewed'],
  ['suggestion', 'Cho đặt hàng định kỳ hàng tuần, không cần vào đặt lại mỗi lần.', 'new'],
  ['query', 'Có ship hàng về nhà không hay phải tới chợ lấy?', 'resolved'],
  ['bug', 'Thông báo đơn hàng mới không hiện trên iOS Safari.', 'new'],
  ['suggestion', 'Thêm mục Sản phẩm mới tuần này trên trang chủ.', 'reviewed'],
  ['query', 'Có chương trình giảm giá cho khách mua thường xuyên không?', 'new'],
  ['bug', 'Ảnh sản phẩm bị mờ trên iPad Pro.', 'new'],
  ['suggestion', 'Cho phép nhắn tin với admin khi có vấn đề đơn hàng.', 'new'],
  ['query', 'Ứng dụng có trên Google Play Store không?', 'new'],
  ['bug', 'Khi đổi ngôn ngữ sang tiếng Anh thì một số chỗ vẫn hiện tiếng Việt.', 'new'],
  ['suggestion', 'Nên có tính năng đánh giá bằng hình ảnh (review kèm ảnh).', 'new'],
  ['bug', 'Scroll bị giật khi mở danh sách sản phẩm trên Oppo A15.', 'reviewed'],
  ['suggestion', 'Thêm filter theo vùng miền (miền Tây, Đà Lạt, miền Trung).', 'new'],
  ['query', 'Mình mua nhiều sạp cùng lúc thì nhận hàng như thế nào?', 'resolved'],
  ['bug', 'Trang đơn hàng bị trắng khi mất kết nối internet rồi có lại.', 'new'],
  ['suggestion', 'Cho xem lịch sử giá sản phẩm theo tuần.', 'new'],
  ['query', 'Farmer có bị tính phí khi dùng MarketLink không?', 'resolved'],
  ['bug', 'Chuyển trang chậm khi bấm từ giỏ hàng sang thanh toán.', 'reviewed'],
  ['suggestion', 'Thêm chức năng quét QR code để nhận hàng nhanh.', 'new'],
];

// --- Build SQL ---
let sql = `-- ==========================================================================================
-- MarketLink — EXTENDED SEED DATA: 6-month operational history (auto-generated)
-- ==========================================================================================
-- Generated by scripts/generate-seed.js. Run after db/seed.sql.
-- 100+ customers, 20 farmers, 500+ orders, hundreds of reviews, chat, feedback.
-- Safe to run repeatedly.
-- ==========================================================================================

SET NAMES utf8mb4;
SET @pw := '\$2y\$10\$QECyiDw14FWH42GLLZE9l.wmNFH4v8ZHLz.UORUBYw3xGS4iDsTtW';

-- ===== 1. ADDITIONAL USERS =====

-- 1.1 Second admin
INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('admin2@marketlink.vn', @pw, 'admin', '${esc('Phạm Minh Quang')}', '0900000100',
   '${esc('Quận 3, TP. Hồ Chí Minh')}', 'active', UTC_TIMESTAMP() - INTERVAL 170 DAY)
AS new ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name,
                        phone = new.phone, role = new.role, status = new.status;

-- 1.2 Customers (100+)
`;

// Generate 110 customers
const customers = [];
const usedPhones = new Set();
for (let i = 2; i <= 110; i++) {
  const gender = rnd(0, 1) === 0 ? 'm' : 'f';
  const name = vietName(gender);
  const phone = `09${String(rnd(10000000, 99999999)).padStart(8, '0')}`;
  if (usedPhones.has(phone)) continue;
  usedPhones.add(phone);
  const addr = vietAddress();
  const daysAgo = Math.max(1, 180 - Math.floor((i / 110) * 175));
  const status = i === 50 || i === 75 ? 'inactive' : (i === 100 ? 'suspended' : 'active');
  customers.push({ email: `customer${i}@marketlink.vn`, name, phone, addr, daysAgo, status });
}

// Write customers in batches of 20
for (let batch = 0; batch < customers.length; batch += 20) {
  const chunk = customers.slice(batch, batch + 20);
  sql += `INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES\n`;
  sql += chunk.map((c, idx) =>
    `  ('${c.email}', @pw, 'customer', '${esc(c.name)}', '${c.phone}', '${esc(c.addr)}', '${c.status}', UTC_TIMESTAMP() - INTERVAL ${c.daysAgo} DAY)`
  ).join(',\n');
  sql += `\nAS new ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name,\n`;
  sql += `                        phone = new.phone, status = new.status;\n\n`;
}

// 1.3 Additional farmers (11-20)
sql += `-- 1.3 Additional Farmers (11-20)\n`;
for (const f of newFarmerStalls) {
  const gender = rnd(0, 1) === 0 ? 'm' : 'f';
  const name = vietName(gender);
  const phone = `09${String(rnd(10000000, 99999999)).padStart(8, '0')}`;
  usedPhones.add(phone);
  const daysAgo = rnd(120, 170);

  sql += `INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('farmer${f.n}@marketlink.vn', @pw, 'farmer', '${esc(name)}', '${phone}', 'TP. Hồ Chí Minh', 'active', UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY)
AS new ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name, phone = new.phone;\n\n`;

  sql += `INSERT INTO farmer_profiles (user_id, stall_name, contact_person, description, order_cutoff_hours, approval_status, approved_at)
SELECT u.id, '${esc(f.name)}', u.full_name, '${esc(f.desc)}', ${f.cutoff}, 'approved', NOW()
FROM users u WHERE u.email = 'farmer${f.n}@marketlink.vn'
ON DUPLICATE KEY UPDATE stall_name = '${esc(f.name)}', description = '${esc(f.desc)}', order_cutoff_hours = ${f.cutoff}, approval_status = 'approved';\n\n`;

  // farmer_markets
  for (const mkt of f.mkts) {
    const stall_code = `${mkt.charAt(4)}-${rnd(10, 50)}`;
    sql += `INSERT INTO farmer_markets (farmer_id, market_id, stall_code, stall_latitude, stall_longitude, is_active)
SELECT f.id, m.id, '${stall_code}', m.latitude + ${(rnd(-15, 15) / 100000).toFixed(5)}, m.longitude + ${(rnd(-15, 15) / 100000).toFixed(5)}, TRUE
FROM farmer_profiles f JOIN users u ON u.id = f.user_id JOIN markets m ON m.market_name = '${esc(mkt)}'
WHERE u.email = 'farmer${f.n}@marketlink.vn'
ON DUPLICATE KEY UPDATE stall_code = '${stall_code}', is_active = TRUE;\n\n`;

    // operating days
    const days = mkt === 'Chợ Thảo Điền' ? [0, 6] : (mkt === 'Chợ Bến Thành' ? [1,2,3,4,5,6] : [0,1,2,3,4,5,6]);
    const selectedDays = shuffle([...days]).slice(0, rnd(2, days.length));
    for (const d of selectedDays) {
      sql += `INSERT IGNORE INTO farmer_operating_days (farmer_market_id, day_of_week, pickup_start_time, pickup_end_time)
SELECT fm.id, ${d}, '07:00:00', '11:00:00'
FROM farmer_markets fm JOIN farmer_profiles f ON f.id = fm.farmer_id JOIN users u ON u.id = f.user_id
JOIN markets m ON m.id = fm.market_id
WHERE u.email = 'farmer${f.n}@marketlink.vn' AND m.market_name = '${esc(mkt)}';\n`;
    }
    sql += '\n';
  }

  // Add to farmerMarkets for order generation
  farmerMarkets[`farmer${f.n}@marketlink.vn`] = f.mkts;
}

// 1.4 Pending farmer
sql += `-- 1.4 Pending farmer
INSERT INTO users (email, password_hash, role, full_name, phone, address, status, created_at) VALUES
  ('farmer-pending@marketlink.vn', @pw, 'farmer', '${esc('Trịnh Văn Tài')}', '0900000301',
   '${esc('Hóc Môn, TP. Hồ Chí Minh')}', 'active', UTC_TIMESTAMP() - INTERVAL 3 DAY)
AS new ON DUPLICATE KEY UPDATE password_hash = new.password_hash, full_name = new.full_name;

INSERT INTO farmer_profiles (user_id, stall_name, contact_person, description, order_cutoff_hours, approval_status)
SELECT u.id, '${esc('Rau sạch Tài Hóc Môn')}', u.full_name,
       '${esc('Rau ăn lá trồng theo tiêu chuẩn VietGAP ở Hóc Môn.')}', 12, 'pending'
FROM users u WHERE u.email = 'farmer-pending@marketlink.vn'
ON DUPLICATE KEY UPDATE stall_name = '${esc('Rau sạch Tài Hóc Môn')}', approval_status = 'pending';

`;

// 2. New products for new farmers
sql += `-- ===== 2. NEW PRODUCTS =====\n`;
for (const [farmN, prods] of Object.entries(newProducts)) {
  const catSlug = newFarmerStalls.find(f => f.n === Number(farmN)).cat;
  for (const p of prods) {
    sql += `INSERT INTO products (farmer_id, category_id, name, description, price, unit, stock_quantity, status, is_hidden)
SELECT f.id, c.id, '${esc(p.name)}', '${esc(p.desc)}', ${p.price}, '${p.unit}', ${p.stock}, 'available', FALSE
FROM users u JOIN farmer_profiles f ON f.user_id = u.id JOIN categories c ON c.slug = '${catSlug}'
WHERE u.email = 'farmer${farmN}@marketlink.vn'
ON DUPLICATE KEY UPDATE description = '${esc(p.desc)}', price = ${p.price}, stock_quantity = ${p.stock};\n`;
  }
  sql += '\n';
}

// Weekly stock templates for new products
sql += `-- Weekly stock templates for new products
INSERT INTO weekly_stock_templates (farmer_id, product_id, day_of_week, default_quantity, default_price, is_active)
SELECT f.id, p.id, d.day_of_week, IF(d.day_of_week IN (0, 6), 30, 20), NULL, TRUE
FROM farmer_profiles f
JOIN users u ON u.id = f.user_id
JOIN products p ON p.farmer_id = f.id AND p.is_deleted = FALSE
JOIN (SELECT DISTINCT fm.farmer_id, od.day_of_week
        FROM farmer_operating_days od
        JOIN farmer_markets fm ON fm.id = od.farmer_market_id AND fm.is_active = TRUE) d
  ON d.farmer_id = f.id
WHERE u.email REGEXP '^farmer(1[1-9]|20)@marketlink[.]vn$'
ON DUPLICATE KEY UPDATE default_quantity = IF(d.day_of_week IN (0, 6), 30, 20), is_active = TRUE;

`;

// 3. ORDERS — 500+ across 6 months
sql += `-- ===== 3. HISTORICAL ORDERS (500+) =====\n`;
sql += `DELETE h FROM order_status_history h JOIN orders o ON o.id = h.order_id WHERE o.order_code LIKE 'ML-HIST-%';\n`;
sql += `DELETE r FROM reviews r JOIN orders o ON o.id = r.order_id WHERE o.order_code LIKE 'ML-HIST-%';\n`;
sql += `DELETE oi FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.order_code LIKE 'ML-HIST-%';\n`;
sql += `DELETE FROM orders WHERE order_code LIKE 'ML-HIST-%';\n\n`;

const allFarmers = Object.keys(farmerMarkets);
const allCustomers = ['customer@marketlink.vn', ...customers.filter(c => c.status === 'active').map(c => c.email)];
const statuses = ['completed','completed','completed','completed','completed','completed','completed','completed','declined','cancelled']; // 80% completed
let orderNum = 1;

// Generate orders month by month with growth
const monthConfigs = [
  { daysAgoStart: 180, daysAgoEnd: 150, count: 30 },
  { daysAgoStart: 149, daysAgoEnd: 120, count: 50 },
  { daysAgoStart: 119, daysAgoEnd: 90, count: 70 },
  { daysAgoStart: 89, daysAgoEnd: 60, count: 90 },
  { daysAgoStart: 59, daysAgoEnd: 30, count: 120 },
  { daysAgoStart: 29, daysAgoEnd: 1, count: 150 },
];

for (const mc of monthConfigs) {
  const batchOrders = [];
  for (let i = 0; i < mc.count; i++) {
    const farmerEmail = pick(allFarmers);
    const mkt = pick(farmerMarkets[farmerEmail]);
    const custEmail = pick(allCustomers);
    const daysAgo = rnd(mc.daysAgoEnd, mc.daysAgoStart);
    const status = pick(statuses);
    const code = `ML-HIST-${String(orderNum++).padStart(4, '0')}`;
    batchOrders.push({ code, custEmail, farmerEmail, mkt, daysAgo, status });
  }

  // Write in batches of 30
  for (let b = 0; b < batchOrders.length; b += 30) {
    const chunk = batchOrders.slice(b, b + 30);
    sql += `INSERT INTO orders (order_code, customer_id, farmer_id, market_id, slot_id, pickup_date, pickup_start,
                    pickup_end, cutoff_at, total_amount, status, created_at)
SELECT x.code, c.id, f.id, m.id, NULL,
       DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY,
       '08:00:00', '09:00:00',
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL x.days_ago DAY, '08:00:00') - INTERVAL fp.order_cutoff_hours HOUR,
       0, x.status,
       TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) - INTERVAL (x.days_ago + 2) DAY, '08:00:00') - INTERVAL 7 HOUR
FROM (\n`;
    sql += chunk.map((o, idx) =>
      `  ${idx === 0 ? 'SELECT' : 'UNION ALL SELECT'} '${o.code}' AS code, '${o.custEmail}' AS cust, '${o.farmerEmail}' AS farm, '${esc(o.mkt)}' AS mkt, ${o.daysAgo} AS days_ago, '${o.status}' AS status`
    ).join('\n');
    sql += `\n) x
JOIN users c ON c.email = x.cust
JOIN users u ON u.email = x.farm
JOIN farmer_profiles f ON f.user_id = u.id
JOIN farmer_profiles fp ON fp.user_id = u.id
JOIN farmer_markets fm ON fm.farmer_id = f.id
JOIN markets m ON m.id = fm.market_id AND m.market_name = x.mkt;\n\n`;
  }
}

// Order status history
sql += `-- ===== 4. ORDER STATUS HISTORY =====
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, NULL, 'placed', o.customer_id, NULL, o.created_at
FROM orders o WHERE o.order_code LIKE 'ML-HIST-%';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'placed', 'accepted', fu.id, NULL, o.created_at + INTERVAL 4 HOUR
FROM orders o JOIN farmer_profiles f ON f.id = o.farmer_id JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status IN ('completed','ready','accepted','cancelled');

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'accepted', 'ready', fu.id, NULL, o.created_at + INTERVAL 20 HOUR
FROM orders o JOIN farmer_profiles f ON f.id = o.farmer_id JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status IN ('completed','ready');

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'ready', 'completed', fu.id, NULL, TIMESTAMP(o.pickup_date, '08:30:00') - INTERVAL 7 HOUR
FROM orders o JOIN farmer_profiles f ON f.id = o.farmer_id JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'placed', 'declined', fu.id, '${esc('Hết hàng, không đủ giao.')}', o.created_at + INTERVAL 6 HOUR
FROM orders o JOIN farmer_profiles f ON f.id = o.farmer_id JOIN users fu ON fu.id = f.user_id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'declined';

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
SELECT o.id, 'accepted', 'cancelled', o.customer_id, '${esc('Khách thay đổi kế hoạch.')}', o.created_at + INTERVAL 12 HOUR
FROM orders o WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'cancelled';

`;

// Order items
sql += `-- ===== 5. ORDER ITEMS =====
INSERT IGNORE INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, p.unit, GREATEST(1, MOD(o.id, 4) + 1), p.price * GREATEST(1, MOD(o.id, 4) + 1)
FROM orders o JOIN products p ON p.farmer_id = o.farmer_id AND p.is_deleted = FALSE
WHERE o.order_code LIKE 'ML-HIST-%'
  AND p.id = (SELECT MIN(p2.id) FROM products p2 WHERE p2.farmer_id = o.farmer_id AND p2.is_deleted = FALSE);

INSERT IGNORE INTO order_items (order_id, product_id, product_name, unit_price, unit, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, p.unit, GREATEST(1, MOD(o.id, 3) + 1), p.price * GREATEST(1, MOD(o.id, 3) + 1)
FROM orders o JOIN products p ON p.farmer_id = o.farmer_id AND p.is_deleted = FALSE
WHERE o.order_code LIKE 'ML-HIST-%'
  AND p.id = (SELECT MIN(p2.id) FROM products p2 WHERE p2.farmer_id = o.farmer_id AND p2.is_deleted = FALSE
              AND p2.id > (SELECT MIN(p3.id) FROM products p3 WHERE p3.farmer_id = o.farmer_id AND p3.is_deleted = FALSE));

UPDATE orders o
JOIN (SELECT order_id, SUM(subtotal) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
SET o.total_amount = t.total WHERE o.order_code LIKE 'ML-HIST-%';

`;

// Reviews
sql += `-- ===== 6. REVIEWS =====
INSERT INTO reviews (customer_id, order_id, target_type, product_id, farmer_id, rating, comment, status, created_at)
SELECT o.customer_id, o.id, 'product', oi.product_id, NULL,
       CASE MOD(o.id, 5) WHEN 0 THEN 5 WHEN 1 THEN 4 WHEN 2 THEN 5 WHEN 3 THEN 3 ELSE 4 END,
       CASE MOD(o.id, ${productReviews.length})
${productReviews.map((r, i) => `         WHEN ${i} THEN '${esc(r)}'`).join('\n')}
       END,
       IF(MOD(o.id, 50) = 0, 'hidden', 'visible'),
       TIMESTAMP(o.pickup_date + INTERVAL 1 DAY, '10:00:00') - INTERVAL 7 HOUR
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed' AND MOD(o.id, 2) = 0
  AND oi.id = (SELECT MIN(oi2.id) FROM order_items oi2 WHERE oi2.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.target_type = 'product');

INSERT INTO reviews (customer_id, order_id, target_type, product_id, farmer_id, rating, comment, status, created_at)
SELECT o.customer_id, o.id, 'farmer', NULL, o.farmer_id,
       CASE MOD(o.id, 5) WHEN 0 THEN 5 WHEN 1 THEN 4 WHEN 2 THEN 5 WHEN 3 THEN 4 ELSE 3 END,
       CASE MOD(o.id, ${stallReviews.length})
${stallReviews.map((r, i) => `         WHEN ${i} THEN '${esc(r)}'`).join('\n')}
       END,
       'visible',
       TIMESTAMP(o.pickup_date + INTERVAL 1 DAY, '10:05:00') - INTERVAL 7 HOUR
FROM orders o WHERE o.order_code LIKE 'ML-HIST-%' AND o.status = 'completed' AND MOD(o.id, 3) = 0
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.target_type = 'farmer');

INSERT INTO review_responses (review_id, farmer_id, response_text, created_at)
SELECT r.id, r.farmer_id,
       CASE MOD(r.id, ${farmerResponses.length})
${farmerResponses.map((r, i) => `         WHEN ${i} THEN '${esc(r)}'`).join('\n')}
       END,
       r.created_at + INTERVAL 5 HOUR
FROM reviews r JOIN orders o ON o.id = r.order_id
WHERE o.order_code LIKE 'ML-HIST-%' AND r.target_type = 'farmer' AND MOD(r.id, 3) = 0
  AND NOT EXISTS (SELECT 1 FROM review_responses rr WHERE rr.review_id = r.id);

-- Recompute rating caches
UPDATE products p SET p.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.target_type = 'product' AND r.product_id = p.id AND r.status = 'visible'), 0),
    p.rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.target_type = 'product' AND r.product_id = p.id AND r.status = 'visible');
UPDATE farmer_profiles f SET f.rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.target_type = 'farmer' AND r.farmer_id = f.id AND r.status = 'visible'), 0),
    f.rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.target_type = 'farmer' AND r.farmer_id = f.id AND r.status = 'visible');

`;

// Favorites
sql += `-- ===== 7. FAVORITES =====\n`;
const favCustomers = shuffle([...allCustomers]).slice(0, 40);
for (const ce of favCustomers) {
  const fe = pick(allFarmers);
  sql += `INSERT IGNORE INTO favorites (customer_id, target_type, farmer_id, product_id, market_id, target_id)
SELECT c.id, 'farmer', f.id, NULL, NULL, f.id FROM users c JOIN users fu ON fu.email = '${fe}'
JOIN farmer_profiles f ON f.user_id = fu.id WHERE c.email = '${ce}';\n`;
}
for (let i = 0; i < 20; i++) {
  const ce = pick(allCustomers);
  const mkt = pick(markets);
  sql += `INSERT IGNORE INTO favorites (customer_id, target_type, farmer_id, product_id, market_id, target_id)
SELECT c.id, 'market', NULL, NULL, m.id, m.id FROM users c JOIN markets m ON m.market_name = '${esc(mkt)}'
WHERE c.email = '${ce}';\n`;
}
sql += '\n';

// Feedback
sql += `-- ===== 8. FEEDBACK =====\n`;
for (let i = 0; i < feedbackMessages.length; i++) {
  const [type, msg, status] = feedbackMessages[i];
  const ce = rnd(0, 3) === 0 ? null : pick(allCustomers);
  const daysAgo = rnd(1, 170);
  if (ce) {
    sql += `INSERT INTO feedbacks (user_id, type, message, status, created_at)
SELECT u.id, '${type}', '${esc(msg)}', '${status}', UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY
FROM users u WHERE u.email = '${ce}'
AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.message = '${esc(msg)}');\n`;
  } else {
    sql += `INSERT INTO feedbacks (user_id, type, message, status, created_at)
SELECT NULL, '${type}', '${esc(msg)}', '${status}', UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.message = '${esc(msg)}');\n`;
  }
}
sql += '\n';

// Chat messages
sql += `-- ===== 9. CHAT MESSAGES =====\n`;
const chatCustomers = shuffle([...allCustomers]).slice(0, 50);
for (let i = 0; i < chatCustomers.length; i++) {
  const ce = chatCustomers[i];
  const [q, intent, a] = chatQuestions[i % chatQuestions.length];
  const daysAgo = rnd(1, 170);
  sql += `INSERT INTO chat_messages (user_id, session_key, role, message, intent, created_at)
SELECT u.id, CONCAT('ext-sess-', u.id, '-${i}'), 'user', '${esc(q)}', '${intent}', UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY
FROM users u WHERE u.email = '${ce}'
AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.user_id = u.id AND cm.message = '${esc(q)}');
INSERT INTO chat_messages (user_id, session_key, role, message, intent, created_at)
SELECT u.id, CONCAT('ext-sess-', u.id, '-${i}'), 'bot', '${esc(a)}', NULL, UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY + INTERVAL 1 MINUTE
FROM users u WHERE u.email = '${ce}'
AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.user_id = u.id AND cm.message = '${esc(a)}');\n`;
}
sql += '\n';

// Notifications
sql += `-- ===== 10. NOTIFICATIONS =====\n`;
const notifCustomers = shuffle([...allCustomers]).slice(0, 60);
const notifKinds = [
  { kind: 'order_accepted', title: 'Đơn hàng được chấp nhận', msg: 'Sạp đã chấp nhận đơn hàng của bạn.', link: '/customer/orders' },
  { kind: 'order_ready', title: 'Đơn hàng sẵn sàng', msg: 'Đơn hàng đã sẵn sàng để nhận.', link: '/customer/orders' },
  { kind: 'order_completed', title: 'Đơn hoàn tất', msg: 'Đơn hàng đã hoàn tất. Hãy đánh giá!', link: '/customer/orders' },
  { kind: 'order_declined', title: 'Đơn bị từ chối', msg: 'Sạp đã từ chối đơn hàng của bạn.', link: '/customer/orders' },
];
for (let i = 0; i < notifCustomers.length; i++) {
  const nk = notifKinds[i % notifKinds.length];
  const daysAgo = rnd(1, 170);
  const isRead = rnd(0, 1) === 0;
  sql += `INSERT INTO notifications (user_id, kind, title, message, link, is_read, created_at)
SELECT u.id, '${nk.kind}', '${esc(nk.title)}', '${esc(nk.msg)}', '${nk.link}', ${isRead}, UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY
FROM users u WHERE u.email = '${notifCustomers[i]}'
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.kind = '${nk.kind}' AND n.message = '${esc(nk.msg)}');\n`;
}

// Farmer notifications
for (const fe of allFarmers.slice(0, 15)) {
  for (let j = 0; j < rnd(2, 5); j++) {
    const daysAgo = rnd(1, 170);
    sql += `INSERT INTO notifications (user_id, kind, title, message, link, is_read, created_at)
SELECT u.id, 'order_placed', '${esc('Đơn hàng mới')}', '${esc(`Bạn có đơn hàng mới #${rnd(1000,9999)}.`)}', '/farmer/orders', ${rnd(0,1)}, UTC_TIMESTAMP() - INTERVAL ${daysAgo} DAY
FROM users u WHERE u.email = '${fe}'
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.message = '${esc(`Bạn có đơn hàng mới #${rnd(1000,9999)}.`)}');\n`;
  }
}

// Admin notifications
sql += `INSERT INTO notifications (user_id, kind, title, message, link, is_read, created_at)
SELECT u.id, 'farmer_application', '${esc('Đơn đăng ký Farmer mới')}', '${esc('Trịnh Văn Tài đã nộp đơn đăng ký bán hàng.')}', '/admin/farmers', FALSE, UTC_TIMESTAMP() - INTERVAL 3 DAY
FROM users u WHERE u.email = 'admin@marketlink.vn'
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.message = '${esc('Trịnh Văn Tài đã nộp đơn đăng ký bán hàng.')}');

INSERT INTO notifications (user_id, kind, title, message, link, is_read, created_at)
SELECT u.id, 'feedback_new', '${esc('Góp ý mới')}', '${esc('Có góp ý mới cần xử lý.')}', '/admin/feedback', FALSE, UTC_TIMESTAMP() - INTERVAL 1 DAY
FROM users u WHERE u.email = 'admin@marketlink.vn'
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.message = '${esc('Có góp ý mới cần xử lý.')}');

`;

// Announcements
sql += `-- ===== 11. ANNOUNCEMENTS =====
INSERT INTO announcements (title, content, audience, created_by, is_active, starts_at, ends_at, created_at)
SELECT x.title, x.content, x.audience, admin.id, x.is_active, x.starts_at, x.ends_at, x.created_at
FROM (
  SELECT '${esc('Chào mừng đến với MarketLink!')}' AS title,
         '${esc('MarketLink chính thức ra mắt! Đặt trước rau củ quả tươi từ các sạp nông sản tại 4 chợ TP.HCM.')}' AS content,
         'all' AS audience, TRUE AS is_active,
         UTC_TIMESTAMP() - INTERVAL 180 DAY AS starts_at, UTC_TIMESTAMP() - INTERVAL 150 DAY AS ends_at,
         UTC_TIMESTAMP() - INTERVAL 180 DAY AS created_at
  UNION ALL
  SELECT '${esc('Ưu đãi cuối tháng 9')}',
         '${esc('Từ 25/09 đến 30/09, đơn hàng đầu tiên của khách mới giảm 10%!')}',
         'all', TRUE, UTC_TIMESTAMP() - INTERVAL 2 DAY, UTC_TIMESTAMP() + INTERVAL 3 DAY, UTC_TIMESTAMP() - INTERVAL 2 DAY
) x JOIN users admin ON admin.email = 'admin@marketlink.vn'
WHERE NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = x.title);
`;

// Write file
fs.writeFileSync(OUT, sql, 'utf8');
const lines = sql.split('\n').length;
console.log(`Generated ${OUT} (${lines} lines, ${(sql.length / 1024).toFixed(0)} KB)`);
console.log(`- ${customers.length} customers`);
console.log(`- ${newFarmerStalls.length} new farmers (total 20 + 1 pending)`);
console.log(`- ${Object.values(newProducts).flat().length} new products`);
console.log(`- ${orderNum - 1} orders across 6 months`);
console.log(`- ${chatCustomers.length} chat sessions`);
console.log(`- ${feedbackMessages.length} feedback entries`);
