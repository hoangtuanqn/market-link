/* MarketLink prototype · shared demo data.
   Kept consistent with FR-100..102 (4 markets in HCMC, 10 Farmers, products, orders in all 6 states).
   Anything marked todo: … is not defined by the SRS / decisions and must be confirmed by the team. */
window.PT = window.PT || {};
(function (PT) {
  PT.today = { label: 'Thu 24/09/2026', weekday: 4, date: '24/09/2026' };
  PT.week = [
    { value: 'thu', label: 'Thu', sub: '24/09', long: 'Thursday', dow: 4 },
    { value: 'fri', label: 'Fri', sub: '25/09', long: 'Friday', dow: 5 },
    { value: 'sat', label: 'Sat', sub: '26/09', long: 'Saturday', dow: 6 },
    { value: 'sun', label: 'Sun', sub: '27/09', long: 'Sunday', dow: 0 },
    { value: 'wed', label: 'Wed', sub: '30/09', long: 'Wednesday', dow: 3 },
  ];

  // The seven weekdays, matching market_operating_days.day_of_week (0 = Sun … 6 = Sat)
  // and the `day` query on GET /api/markets. Used where the screen browses by weekday
  // rather than by a dated market morning.
  PT.weekdays = [
    { value: 'mon', label: 'Monday', dow: 1 },
    { value: 'tue', label: 'Tuesday', dow: 2 },
    { value: 'wed', label: 'Wednesday', dow: 3 },
    { value: 'thu', label: 'Thursday', dow: 4 },
    { value: 'fri', label: 'Friday', dow: 5 },
    { value: 'sat', label: 'Saturday', dow: 6 },
    { value: 'sun', label: 'Sunday', dow: 0 },
  ];

  PT.users = {
    customer: { name: 'Khang', full: 'Nguyễn Minh Khang', email: 'khang@example.com', phone: '0903 118 218', address: '25 Xuân Thủy, Thảo Điền, Thủ Đức' },
    farmer: { name: 'Cô Tư Garden', short: 'Cô Tư', person: 'Nguyễn Thị Tư', email: 'cotu@example.com', phone: '0912 440 540', address: 'Hamlet 3, Tân Phú Trung, Củ Chi' },
    admin: { name: 'Admin' },
  };

  // todo: coordinates are approximate for the real areas; confirm the exact pins in the seed script (FR-100)
  PT.markets = [
    { id: 1, name: 'Thảo Điền Weekend Market', address: '12 Quốc Hương, Thảo Điền Ward, Thủ Đức City', district: 'Thủ Đức', days: [5, 6, 0], open: '06:00', close: '11:00', lat: 10.8036, lng: 106.733, stalls: 14, distance: '2.4 km', saved: true },
    { id: 2, name: 'Thủ Đức Farmers Market', address: 'Võ Văn Ngân, Bình Thọ Ward, Thủ Đức City', district: 'Thủ Đức', days: [6, 0], open: '05:30', close: '10:00', lat: 10.8506, lng: 106.7715, stalls: 9, distance: '4.1 km', saved: false },
    { id: 3, name: 'Phú Mỹ Hưng Saturday Market', address: 'Nguyễn Đức Cảnh, Tân Phong Ward, District 7', district: 'District 7', days: [6], open: '06:00', close: '10:00', lat: 10.7286, lng: 106.7189, stalls: 11, distance: '9.8 km', saved: false },
    { id: 4, name: 'Bà Chiểu Green Market', address: 'Bùi Hữu Nghĩa, Ward 1, Bình Thạnh District', district: 'Bình Thạnh', days: [3, 6], open: '06:00', close: '10:30', lat: 10.804, lng: 106.696, stalls: 7, distance: '5.6 km', saved: false },
  ];

  PT.categories = [
    { id: 1, name: 'Leafy greens', count: 24 },
    { id: 2, name: 'Fruit', count: 18 },
    { id: 3, name: 'Dairy', count: 6 },
    { id: 4, name: 'Baked goods', count: 9 },
    { id: 5, name: 'Eggs', count: 4 },
    { id: 6, name: 'Honey & preserves', count: 5 },
    { id: 7, name: 'Mushrooms', count: 3 },
    { id: 8, name: 'Herbs', count: 7 },
  ];

  // approval: pending | approved | rejected | suspended (D-09)
  PT.farmers = [
    { id: 1, stall: 'Cô Tư Garden', person: 'Nguyễn Thị Tư', phone: '0912 440 540', email: 'cotu@example.com', markets: [1, 2], days: 'Sat, Sun', pickup: '06:00 – 10:30', rating: 4.6, reviews: 32, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8039, lng: 106.7334, stallCode: 'A12', registered: '02/08/2026', about: 'Water spinach, choy sum and herbs from a 2-hectare plot in Củ Chi. Cut the evening before market day.' },
    { id: 2, stall: 'Út Hiền Orchard', person: 'Trần Văn Hiền', phone: '0987 210 031', email: 'uthien@example.com', markets: [2], days: 'Sat, Sun', pickup: '06:00 – 09:30', rating: 4.8, reviews: 21, distance: '4.1 km', approval: 'approved', cutoffHours: 12, lat: 10.8509, lng: 106.7719, stallCode: 'B03', registered: '10/08/2026', about: 'Green-skin pomelo and longan from Bến Tre, picked the day before.' },
    { id: 3, stall: 'Củ Chi Goat Farm', person: 'Lê Minh Khang', phone: '0938 776 220', email: 'traide@example.com', markets: [2, 3], days: 'Sat, Sun', pickup: '06:30 – 09:30', rating: 4.4, reviews: 15, distance: '4.1 km', approval: 'approved', cutoffHours: 18, lat: 10.8503, lng: 106.7711, stallCode: 'B07', registered: '12/08/2026', about: 'Goat milk, yogurt and fresh cheese. Pasteurised the morning of market day.' },
    { id: 4, stall: 'Gió Nam Bakery', person: 'Phạm Thu Hà', phone: '0908 331 905', email: 'gionam@example.com', markets: [1, 3], days: 'Fri, Sat', pickup: '07:00 – 10:00', rating: 4.9, reviews: 48, distance: '2.4 km', approval: 'approved', cutoffHours: 24, lat: 10.8033, lng: 106.7326, stallCode: 'A04', registered: '15/08/2026', about: 'Sourdough and rye, baked at 5am. Pre-orders are the only way to be sure of a loaf.' },
    { id: 5, stall: 'Ba Lành Farm', person: 'Võ Ba Lành', phone: '0913 002 771', email: 'balanh@example.com', markets: [1], days: 'Fri, Sat, Sun', pickup: '06:00 – 10:30', rating: 4.5, reviews: 19, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8041, lng: 106.7336, stallCode: 'A09', registered: '20/08/2026', about: 'Free-range eggs and green-skin pomelo from Long Khánh.' },
    { id: 6, stall: 'Hóc Môn Greens', person: 'Đặng Thị Mai', phone: '0977 145 620', email: 'raumai@example.com', markets: [4], days: 'Wed, Sat', pickup: '06:00 – 10:00', rating: 4.3, reviews: 11, distance: '5.6 km', approval: 'approved', cutoffHours: 12, lat: 10.8043, lng: 106.6964, stallCode: 'D02', registered: '22/08/2026', about: 'Mustard greens, morning glory and gourds from Hóc Môn.' },
    { id: 7, stall: 'U Minh Forest Honey', person: 'Huỳnh Văn Tài', phone: '0919 880 114', email: 'matong@example.com', markets: [3, 4], days: 'Wed, Sat', pickup: '06:30 – 10:00', rating: 4.7, reviews: 27, distance: '9.8 km', approval: 'approved', cutoffHours: 24, lat: 10.729, lng: 106.7193, stallCode: 'C05', registered: '25/08/2026', about: 'Raw forest honey and bee pollen from U Minh.' },
    { id: 8, stall: 'Bình Chánh Mushrooms', person: 'Ngô Thị Lan', phone: '0933 456 780', email: 'namlan@example.com', markets: [1, 4], days: 'Fri, Sat', pickup: '06:00 – 10:00', rating: 4.2, reviews: 8, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8031, lng: 106.7329, stallCode: 'A15', registered: '01/09/2026', about: 'Oyster and straw mushrooms grown on rice straw.' },
    { id: 9, stall: 'Cô Ba Kitchen', person: 'Lý Thị Ba', phone: '0906 222 410', email: 'coba@example.com', markets: [2], days: 'Sat, Sun', pickup: '06:30 – 09:30', rating: null, reviews: 0, distance: '4.1 km', approval: 'pending', cutoffHours: 12, lat: null, lng: null, stallCode: '', registered: '22/09/2026', about: 'Bánh bò and bánh chuối, steamed on the morning of the market.' },
    { id: 10, stall: 'Long Khánh Fruit Garden', person: 'Bùi Quốc Thịnh', phone: '0915 668 902', email: 'longkhanh@example.com', markets: [3], days: 'Sat', pickup: '06:00 – 10:00', rating: 3.9, reviews: 6, distance: '9.8 km', approval: 'suspended', cutoffHours: 12, lat: 10.7283, lng: 106.7186, stallCode: 'C11', registered: '05/09/2026', about: 'Durian, rambutan and mangosteen in season.', suspendedReason: 'Repeated no-shows at Phú Mỹ Hưng on 12/09 and 19/09.' },
    { id: 11, stall: 'Chú Bảy Greens', person: 'Nguyễn Văn Bảy', phone: '0907 555 310', email: 'chubay@example.com', markets: [4], days: 'Wed', pickup: '', rating: null, reviews: 0, approval: 'pending', cutoffHours: 12, lat: null, lng: null, stallCode: '', registered: '23/09/2026', about: '' },
  ];

  // status: available | sold_out | unavailable (FR-064). flag is the seller's handwritten note.
  PT.products = [
    { id: 1, name: 'Củ Chi water spinach', farmer: 1, cat: 1, price: 15000, unit: 'bunch', stock: 12, flag: 'Fresh today', status: 'available', desc: 'Cut on Friday evening, bunches of about 400 g. Best stir-fried with garlic the same day.' },
    { id: 2, name: 'Choy sum', farmer: 1, cat: 1, price: 18000, unit: 'bunch', stock: 8, status: 'available', desc: 'Young choy sum with the flowers still closed. About 350 g a bunch.' },
    { id: 3, name: 'Green-skin pomelo', farmer: 2, cat: 2, price: 65000, unit: 'piece', stock: 2, status: 'available', desc: 'Bến Tre green-skin pomelo, 1.2 to 1.5 kg each. Sweet with a slight bitterness in the pith.' },
    { id: 4, name: 'Goat yogurt', farmer: 3, cat: 3, price: 35000, unit: 'jar', stock: 0, status: 'sold_out', favorite: true, desc: '200 ml jar, no sugar added. Keep chilled and eat within 5 days.' },
    { id: 5, name: 'Sourdough loaf', farmer: 4, cat: 4, price: 45000, unit: 'loaf', stock: 15, flag: 'Baked at 5am', status: 'available', desc: '800 g country loaf, 24-hour ferment. Crust is dark on purpose.' },
    { id: 6, name: 'Free-range eggs', farmer: 5, cat: 5, price: 42000, unit: 'dozen', stock: 20, status: 'available', desc: 'Mixed sizes from hens on pasture. Laid within the last 3 days.' },
    { id: 7, name: 'Thai basil', farmer: 1, cat: 8, price: 8000, unit: 'bunch', stock: 30, status: 'available', desc: 'Large bunch, about 150 g.' },
    { id: 8, name: 'Longan', farmer: 2, cat: 2, price: 55000, unit: 'kg', stock: 25, status: 'available', desc: 'Long tiêu da bò from Bến Tre. Thin skin, small seed.' },
    { id: 9, name: 'Fresh goat cheese', farmer: 3, cat: 3, price: 90000, unit: 'piece', stock: 6, status: 'available', desc: '150 g round, mild and lemony. Made the morning before market day.' },
    { id: 10, name: 'Rye loaf', farmer: 4, cat: 4, price: 55000, unit: 'loaf', stock: 3, status: 'available', desc: '900 g, 60 percent rye. Slices best the day after baking.' },
    { id: 11, name: 'Cinnamon rolls', farmer: 4, cat: 4, price: 25000, unit: 'piece', stock: 0, status: 'unavailable', desc: 'Not baked this week. Back when the oven is repaired.' },
    { id: 12, name: 'Mustard greens', farmer: 6, cat: 1, price: 12000, unit: 'bunch', stock: 18, status: 'available', desc: 'Cải bẹ xanh for soup or pickling. About 500 g.' },
    { id: 13, name: 'Bitter gourd', farmer: 6, cat: 1, price: 22000, unit: 'kg', stock: 10, status: 'available', desc: 'Small, pale variety, less bitter.' },
    { id: 14, name: 'Raw forest honey', farmer: 7, cat: 6, price: 180000, unit: 'jar', stock: 9, status: 'available', desc: '500 ml. Unfiltered, may crystallise in the fridge.' },
    { id: 15, name: 'Bee pollen', farmer: 7, cat: 6, price: 120000, unit: 'jar', stock: 4, status: 'available', desc: '200 g. Store dry and away from light.' },
    { id: 16, name: 'Oyster mushrooms', farmer: 8, cat: 7, price: 30000, unit: 'kg', stock: 1, status: 'available', desc: 'Picked the morning of market day. Cook within 2 days.' },
    { id: 17, name: 'Straw mushrooms', farmer: 8, cat: 7, price: 60000, unit: 'kg', stock: 0, status: 'sold_out', desc: 'Small button stage, closed caps.' },
    { id: 18, name: 'Green-skin pomelo', farmer: 5, cat: 2, price: 60000, unit: 'piece', stock: 9, status: 'available', desc: 'Long Khánh pomelo, about 1.3 kg.' },
    { id: 19, name: 'Lemongrass', farmer: 1, cat: 8, price: 6000, unit: 'bunch', stock: 22, status: 'available', desc: 'Bunch of 6 stalks.' },
    { id: 20, name: 'Goat milk', farmer: 3, cat: 3, price: 45000, unit: 'bottle', stock: 14, status: 'available', desc: '500 ml, pasteurised. Drink within 3 days.' },
    { id: 21, name: 'Hóc Môn water spinach', farmer: 6, cat: 1, price: 13000, unit: 'bunch', stock: 24, status: 'available', desc: 'Grown on the riverbank in Hóc Môn. Thinner stems than the Củ Chi variety, about 350 g a bunch.' },
    { id: 22, name: 'Choy sum', farmer: 6, cat: 1, price: 16000, unit: 'bunch', stock: 12, status: 'available', desc: 'Cut Friday afternoon. Bunches of about 400 g.' },
    { id: 23, name: 'Elephant garlic', farmer: 6, cat: 8, price: 25000, unit: 'bulb', stock: 40, status: 'available', desc: 'One large bulb, milder than ordinary garlic. Keeps for weeks in a dry place.' },
    { id: 24, name: 'Duck eggs', farmer: 5, cat: 5, price: 95000, unit: 'tray of 30', plural: 'trays of 30', stock: 12, status: 'available', desc: 'Laid this week. Sold by the tray; we do not split them.' },
    { id: 25, name: 'Dried wood-ear mushrooms', farmer: 8, cat: 7, price: 60000, unit: 'bag', stock: 18, status: 'available', desc: '200 g bag, sun-dried. Soak for 20 minutes before cooking.' },
  ];

  // The units a stall can pick from, plus any it typed itself. products.unit is already VARCHAR(20) in
  // db/schema.sql ("kg, bó, quả, hộp…"), so a stall naming its own unit needs no schema change. What is
  // missing is the plural: English cannot derive "trays of 30" from "tray of 30".
  PT.unitList = [
    { one: 'kg', many: 'kg', kind: 'Weight', builtin: true, used: 6 },
    { one: 'g', many: 'g', kind: 'Weight', builtin: true, used: 0 },
    { one: 'bunch', many: 'bunches', kind: 'Count', builtin: true, used: 9 },
    { one: 'piece', many: 'pieces', kind: 'Count', builtin: true, used: 4 },
    { one: 'bulb', many: 'bulbs', kind: 'Count', builtin: true, used: 1 },
    { one: 'dozen', many: 'dozen', kind: 'Count', builtin: true, used: 1 },
    { one: 'bag', many: 'bags', kind: 'Pack', builtin: true, used: 1 },
    { one: 'jar', many: 'jars', kind: 'Pack', builtin: true, used: 3 },
    { one: 'bottle', many: 'bottles', kind: 'Pack', builtin: true, used: 1 },
    { one: 'loaf', many: 'loaves', kind: 'Pack', builtin: true, used: 2 },
    { one: 'tray of 30', many: 'trays of 30', kind: 'Pack', builtin: false, addedBy: 'Ba Lành Farm', used: 1 },
    { one: 'basket', many: 'baskets', kind: 'Pack', builtin: false, addedBy: 'Hóc Môn Greens', used: 0 },
  ];

  // Orders seen by Customer Khang (FR-101: all 6 states present). One order = one Farmer (D-01).
  PT.orders = [
    { code: '#ML-0421', farmer: 1, market: 1, date: 'Sat 26/09/2026', slot: '07:00–07:30', status: 'placed', cutoff: '19:00 25/09', placedAt: '24/09/2026 09:12', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }, { p: 7, qty: 1 }], history: [['placed', '24/09/2026 09:12', 'You']] },
    { code: '#ML-0412', farmer: 1, market: 1, date: 'Sat 26/09/2026', slot: '07:00–07:30', status: 'accepted', cutoff: '19:00 25/09', placedAt: '23/09/2026 20:41', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }, { p: 3, qty: 1 }], history: [['placed', '23/09/2026 20:41', 'You'], ['accepted', '24/09/2026 06:55', 'Cô Tư Garden']] },
    { code: '#ML-0415', farmer: 2, market: 2, date: 'Sun 27/09/2026', slot: '06:30–07:00', status: 'accepted', cutoff: '18:30 26/09', placedAt: '23/09/2026 21:10', items: [{ p: 8, qty: 2 }], history: [['placed', '23/09/2026 21:10', 'You'], ['accepted', '24/09/2026 07:20', 'Út Hiền Orchard']] },
    { code: '#ML-0409', farmer: 4, market: 1, date: 'Fri 25/09/2026', slot: '07:30–08:00', status: 'ready', cutoff: '07:30 24/09', locked: true, placedAt: '22/09/2026 18:02', items: [{ p: 5, qty: 1 }, { p: 10, qty: 1 }], history: [['placed', '22/09/2026 18:02', 'You'], ['accepted', '22/09/2026 19:30', 'Gió Nam Bakery'], ['ready', '24/09/2026 06:10', 'Gió Nam Bakery']] },
    { code: '#ML-0398', farmer: 3, market: 2, date: 'Sun 20/09/2026', slot: '08:00–08:30', status: 'completed', cutoff: '14:00 19/09', locked: true, placedAt: '18/09/2026 12:00', items: [{ p: 4, qty: 4 }], reviewed: false, history: [['placed', '18/09/2026 12:00', 'You'], ['accepted', '18/09/2026 14:20', 'Củ Chi Goat Farm'], ['ready', '20/09/2026 06:30', 'Củ Chi Goat Farm'], ['completed', '20/09/2026 08:14', 'Củ Chi Goat Farm']] },
    { code: '#ML-0381', farmer: 1, market: 1, date: 'Sat 19/09/2026', slot: '06:30–07:00', status: 'completed', cutoff: '18:30 18/09', locked: true, placedAt: '17/09/2026 20:05', items: [{ p: 1, qty: 3 }, { p: 19, qty: 2 }], reviewed: true, history: [['placed', '17/09/2026 20:05', 'You'], ['accepted', '17/09/2026 21:00', 'Cô Tư Garden'], ['ready', '19/09/2026 05:50', 'Cô Tư Garden'], ['completed', '19/09/2026 06:48', 'Cô Tư Garden']] },
    { code: '#ML-0402', farmer: 2, market: 2, date: 'Sat 19/09/2026', slot: '07:00–07:30', status: 'declined', cutoff: '19:00 18/09', locked: true, placedAt: '18/09/2026 10:30', items: [{ p: 3, qty: 3 }], reason: 'The stall ran out of pomelo for this weekend.', history: [['placed', '18/09/2026 10:30', 'You'], ['declined', '18/09/2026 16:45', 'Út Hiền Orchard']] },
    { code: '#ML-0377', farmer: 5, market: 1, date: 'Sun 13/09/2026', slot: '08:00–08:30', status: 'cancelled', cutoff: '20:00 12/09', locked: true, placedAt: '11/09/2026 09:00', items: [{ p: 6, qty: 2 }], history: [['placed', '11/09/2026 09:00', 'You'], ['accepted', '11/09/2026 11:15', 'Ba Lành Farm'], ['cancelled', '12/09/2026 07:40', 'You']] },
  ];

  // Incoming orders as seen by Farmer Cô Tư Garden (FR-065)
  PT.farmerOrders = [
    { code: '#ML-0421', who: 'Minh Anh', phone: '0903 ••• 218', date: 'Sat 26/09', slot: '07:00–07:30', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }, { p: 7, qty: 1 }], status: 'placed', isNew: true, note: 'Please pick the smaller bunches if you can.', cutoff: '19:00 25/09' },
    { code: '#ML-0420', who: 'Trần Phúc', phone: '0912 ••• 540', date: 'Sat 26/09', slot: '07:30–08:00', items: [{ p: 19, qty: 3 }, { p: 7, qty: 2 }], status: 'placed', isNew: true, cutoff: '19:30 25/09' },
    { code: '#ML-0419', who: 'Lan Hương', phone: '0987 ••• 031', date: 'Sat 26/09', slot: '06:30–07:00', items: [{ p: 1, qty: 5 }, { p: 2, qty: 3 }, { p: 7, qty: 2 }, { p: 19, qty: 1 }], status: 'placed', cutoff: '18:30 25/09' },
    { code: '#ML-0418', who: 'Quốc Bảo', phone: '0938 ••• 776', date: 'Sun 27/09', slot: '06:00–06:30', items: [{ p: 2, qty: 2 }, { p: 1, qty: 1 }], status: 'placed', cutoff: '18:00 26/09' },
    { code: '#ML-0412', who: 'Minh Khang', phone: '0903 ••• 218', date: 'Sat 26/09', slot: '07:00–07:30', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }], status: 'accepted', cutoff: '19:00 25/09' },
    { code: '#ML-0411', who: 'Thu Thảo', phone: '0909 ••• 402', date: 'Sat 26/09', slot: '08:00–08:30', items: [{ p: 7, qty: 4 }], status: 'accepted', cutoff: '20:00 25/09' },
    { code: '#ML-0405', who: 'Đức Anh', phone: '0916 ••• 118', date: 'Sat 26/09', slot: '06:00–06:30', items: [{ p: 1, qty: 6 }], status: 'accepted', cutoff: '18:00 25/09' },
    { code: '#ML-0396', who: 'Hồng Nhung', phone: '0934 ••• 550', date: 'Fri 25/09', slot: '06:30–07:00', items: [{ p: 2, qty: 2 }], status: 'ready', cutoff: '18:30 24/09' },
    { code: '#ML-0381', who: 'Minh Khang', phone: '0903 ••• 218', date: 'Sat 19/09', slot: '06:30–07:00', items: [{ p: 1, qty: 3 }, { p: 19, qty: 2 }], status: 'completed', cutoff: '18:30 18/09' },
    { code: '#ML-0374', who: 'Bích Ngọc', phone: '0922 ••• 833', date: 'Sat 19/09', slot: '07:00–07:30', items: [{ p: 2, qty: 4 }], status: 'completed', cutoff: '19:00 18/09' },
    { code: '#ML-0366', who: 'Văn Long', phone: '0918 ••• 097', date: 'Sun 13/09', slot: '06:00–06:30', items: [{ p: 1, qty: 10 }], status: 'declined', reason: 'Not enough stock after the rain.', cutoff: '18:00 12/09' },
    { code: '#ML-0360', who: 'Kim Chi', phone: '0901 ••• 664', date: 'Sat 12/09', slot: '07:30–08:00', items: [{ p: 7, qty: 1 }], status: 'cancelled', cutoff: '19:30 11/09' },
  ];

  PT.reviews = [
    { id: 1, author: 'Minh Anh', date: '21/09/2026', target: 'Củ Chi water spinach', targetType: 'product', product: 1, farmer: 1, rating: 5, text: 'Still crisp, and the bunches are bigger than at the market. It was packed and ready at 7 sharp, no waiting.', reply: { by: 'Cô Tư Garden', date: '21/09/2026', text: 'Thank you. We will have choy sum next week too, do stop by.' } },
    { id: 2, author: 'Lan Hương', date: '20/09/2026', target: 'Cô Tư Garden', targetType: 'farmer', farmer: 1, rating: 4, text: 'Friendly and quick. One bunch of choy sum was a little wilted by the time I got there at 9.' },
    { id: 3, author: 'Quốc Bảo', date: '14/09/2026', target: 'Choy sum', targetType: 'product', product: 2, farmer: 1, rating: 5, text: 'Sweet stems, no bitterness. Ordered again for this weekend.' },
    { id: 4, author: 'Thu Thảo', date: '13/09/2026', target: 'Goat yogurt', targetType: 'product', product: 4, farmer: 3, rating: 4, text: 'Tangy and thick. Jars are small for the price but the taste is worth it.', reply: { by: 'Củ Chi Goat Farm', date: '13/09/2026', text: 'We are testing a 350 ml jar in October.' } },
    { id: 5, author: 'Hồng Nhung', date: '07/09/2026', target: 'Sourdough loaf', targetType: 'product', product: 5, farmer: 4, rating: 5, text: 'Best crust in the city. Pre-ordering means I actually get one.' },
    { id: 6, author: 'Văn Long', date: '06/09/2026', target: 'Cô Tư Garden', targetType: 'farmer', farmer: 1, rating: 2, text: 'Order was declined the evening before, so I had no greens for the weekend.', reply: { by: 'Cô Tư Garden', date: '06/09/2026', text: 'Sorry about that. Heavy rain flooded the plot on Friday. We declined early so you could order elsewhere.' } },
    { id: 7, author: 'Anonymous account 4471', date: '02/09/2026', target: 'Raw forest honey', targetType: 'product', product: 14, farmer: 7, rating: 1, text: 'Contact me on Zalo 09xx for cheaper honey, 50 percent off.', flagged: true },
  ];

  PT.notifications = [
    { kind: 'invite', title: 'Do you grow something? Sell it at the market', text: 'Your account can become a stall. Apply with a few photos of your plot and an admin reviews it.', time: 'Today', unread: true },
    { kind: 'ready', title: 'Order #ML-0409 is ready', text: 'Gió Nam Bakery · pick up 07:30–08:00 on Friday 25/09.', time: '06:10', unread: true },
    { kind: 'restock', title: 'Goat yogurt is back in stock', text: 'Củ Chi Goat Farm just added 20 jars.', time: 'Yesterday', unread: true },
    { kind: 'accepted', title: 'Order #ML-0412 was accepted', text: 'Cô Tư Garden confirmed it for Saturday 07:00–07:30.', time: '24/09' },
    { kind: 'accepted', title: 'Order #ML-0415 was accepted', text: 'Út Hiền Orchard confirmed it for Sunday 06:30–07:00.', time: '24/09' },
    { kind: 'announce', title: 'Thảo Điền Weekend Market is closed on Sunday 04/10', text: 'Orders for that day move to Saturday 03/10.', time: '23/09' },
    { kind: 'declined', title: 'Order #ML-0402 was declined', text: 'The stall ran out of pomelo. Nothing to pay.', time: '18/09' },
  ];

  PT.farmerNotifications = [
    { kind: 'placed', title: 'New order #ML-0421 from Minh Anh', text: '3 items · Sat 26/09 · 07:00–07:30. Closes at 19:00 on 25/09.', time: '09:12', unread: true },
    { kind: 'placed', title: 'New order #ML-0420 from Trần Phúc', text: '2 items · Sat 26/09 · 07:30–08:00.', time: '08:40', unread: true },
    { kind: 'cancelled', title: 'Order #ML-0360 was cancelled by Kim Chi', text: '1 bunch of Thai basil went back to stock.', time: '11/09' },
    { kind: 'announce', title: 'Thảo Điền Weekend Market is closed on Sunday 04/10', text: 'Orders for that day move to Saturday 03/10.', time: '23/09' },
  ];

  /* One-off market closures. The announcement about Thảo Điền on 04/10 was already on the home page
     with nothing behind it, so this is where it now comes from. `handling` is what happens to orders
     already placed for that day; the SRS does not define it, so the screens mark it as an open question. */
  PT.closures = [
    { id: 1, market: 1, date: '04/10/2026', weekday: 'Sunday', reason: 'Ward street works on Quốc Hương', handling: 'move', orders: 6, announced: true, by: 'Admin · 23/09/2026' },
    { id: 2, market: 4, date: '21/10/2026', weekday: 'Wednesday', reason: 'Public holiday', handling: 'cancel', orders: 0, announced: false, by: 'Admin · 24/09/2026' },
  ];
  PT.closureHandling = {
    move: ['Move the orders to the next market day', 'Each customer keeps their order and gets the new pickup date. The stall has to be selling that day too.'],
    contact: ['Ask each stall to contact its customers', 'Nothing changes automatically. The stall arranges another time or refunds nothing, because no money has changed hands.'],
    cancel: ['Cancel the orders and tell the customers', 'Stock goes back to the stall (D-02) and the order ends as cancelled, not declined, because the stall did nothing wrong.'],
  };
  /* Days a single stall is not attending, even though the market is open. */
  PT.dayOff = [
    { id: 1, farmer: 1, market: 1, date: '27/09/2026', weekday: 'Sunday', reason: 'Harvest was short after the rain', orders: 2 },
  ];

  PT.announcements = [
    { id: 1, title: 'Thảo Điền Weekend Market is closed on Sunday 04/10', text: 'Orders for that day move to Saturday 03/10. Farmers will confirm again.', from: '23/09/2026', to: '04/10/2026', active: true, audience: 'Everyone' },
    { id: 2, title: 'First green-skin pomelos of the season this week', text: '3 stalls in Thủ Đức are taking pre-orders for Saturday morning.', from: '21/09/2026', to: '27/09/2026', active: true, audience: 'Customers' },
    { id: 3, title: 'Reminder: update your pickup windows before Friday', text: 'Slots are generated from your operating days each week.', from: '14/09/2026', to: '18/09/2026', active: false, audience: 'Farmers' },
  ];

  PT.customers = [
    { id: 1, name: 'Nguyễn Minh Khang', email: 'khang@example.com', phone: '0903 118 218', joined: '01/08/2026', orders: 8, status: 'active' },
    { id: 2, name: 'Phạm Minh Anh', email: 'minhanh@example.com', phone: '0903 552 218', joined: '03/08/2026', orders: 14, status: 'active' },
    { id: 3, name: 'Trần Phúc', email: 'phuc.tran@example.com', phone: '0912 010 540', joined: '11/08/2026', orders: 5, status: 'active' },
    { id: 4, name: 'Lê Lan Hương', email: 'lanhuong@example.com', phone: '0987 300 031', joined: '15/08/2026', orders: 11, status: 'active' },
    { id: 5, name: 'Account 4471', email: 'promo4471@example.com', phone: '0900 000 471', joined: '30/08/2026', orders: 1, status: 'inactive', reason: 'Posted advertising in reviews on 02/09/2026.' },
    { id: 6, name: 'Võ Quốc Bảo', email: 'quocbao@example.com', phone: '0938 900 776', joined: '02/09/2026', orders: 3, status: 'active' },
  ];

  PT.feedback = [
    { id: 1, type: 'bug', from: 'khang@example.com', date: '23/09/2026', text: 'The slot picker on the cart page does not scroll on my phone (iPhone 12, Safari).', status: 'open' },
    { id: 2, type: 'suggestion', from: 'lanhuong@example.com', date: '22/09/2026', text: 'Could you show the pickup queue length so I know how long I will wait at the stall?', status: 'open' },
    { id: 3, type: 'query', from: 'guest', date: '21/09/2026', text: 'Is Bà Chiểu Green Market open on the public holiday?', status: 'answered' },
  ];

  // Pickup slots for Cô Tư Garden at Thảo Điền on Sat 26/09 (D-06: max_orders default 5)
  PT.slots = [
    { value: '0600', time: '06:00–06:30', booked: 5, max: 5 },
    { value: '0630', time: '06:30–07:00', booked: 3, max: 5 },
    { value: '0700', time: '07:00–07:30', booked: 1, max: 5 },
    { value: '0730', time: '07:30–08:00', booked: 0, max: 5 },
    { value: '0800', time: '08:00–08:30', booked: 0, max: 5 },
    { value: '0830', time: '08:30–09:00', booked: 2, max: 5 },
  ];

  PT.cart = [
    { p: 1, qty: 2 },
    { p: 2, qty: 1 },
    { p: 3, qty: 2 },
  ];

  // Extra detail shown on the product page. The SRS product entity has name, description, price, unit,
  // quantity and image only, so these fields are a proposal (see the TODO on public/product.html).
  PT.productDetail = {
    1: { weight: 'about 400 g a bunch', origin: 'Tân Phú Trung, Củ Chi', harvested: 'Friday evening', keeps: '2 days in the fridge, wrapped in paper', updated: 'Thu 24/09 · 06:40', photos: 4 },
  };

  // Review tags, chosen by the customer alongside the star rating. Not in the SRS; a proposal.
  PT.reviewTags = {
    1: [['Ready on time', 14], ['Fresh as described', 11], ['Easy to find the stall', 8], ['Friendly', 7], ['Good value', 5], ['Packed well', 3]],
  };

  // A Customer applying to become a Farmer (FR-002 as an upgrade, FR-071 for the review).
  // farmer_profiles already links to users.user_id, so the account is reused. The evidence below has no
  // columns in db/schema.sql yet: see the TODO on customer/become-farmer.html.
  PT.application = {
    id: 'AP-0007',
    userId: 3,
    person: 'Trần Phúc',
    email: 'phuc.tran@example.com',
    phone: '0912 010 540',
    customerSince: '11/08/2026',
    ordersCollected: 5,
    stall: 'Phúc Family Greens',
    description: 'Half a hectare of leafy greens and herbs behind the house, worked by my wife and me since 2019.',
    categories: ['Leafy greens', 'Herbs'],
    crops: 'Water spinach, mustard greens, perilla, Thai basil, spring onion',
    volume: 'About 120 bunches a week',
    method: 'No pesticides in the last two seasons. We have no certificate for it.',
    plotAddress: 'Tổ 4, Xuân Thới Thượng, Hóc Môn',
    plotLat: 10.8721,
    plotLng: 106.5931,
    plotSize: '5,000 m²',
    farmingSince: '2019',
    marketWanted: 4,
    photos: [
      ['Wide shot of the plot', '22/09/2026'],
      ['Water spinach beds, cut this week', '22/09/2026'],
      ['The shade house and water tank', '23/09/2026'],
    ],
    video: ['Walk along the beds', '48 seconds', '23/09/2026'],
    submitted: '23/09/2026 19:24',
    status: 'pending',
  };


  // Time series for the analytics screens. Generated once and frozen so every screen shows the same numbers.
  PT.series = {
    dayLabels: ['01/09', '02/09', '03/09', '04/09', '05/09', '06/09', '07/09', '08/09', '09/09', '10/09', '11/09', '12/09', '13/09', '14/09', '15/09', '16/09', '17/09', '18/09', '19/09', '20/09', '21/09', '22/09', '23/09', '24/09', '25/09', '26/09', '27/09', '28/09', '29/09', '30/09'],
    revenueNow: [968393, 890808, 1163219, 874767, 1128125, 1051992, 904359, 1150433, 918431, 1136796, 959991, 983204, 1169150, 1390730, 1037510, 1101584, 1324132, 1503042, 1322694, 1241241, 1554986, 1083923, 1518470, 1235030, 1171813, 1170419, 1281944, 1558286, 1240244, 1461065],
    revenuePrev: [1046678, 922017, 1009451, 779939, 781675, 855194, 1086192, 968111, 916924, 1050470, 990195, 919821, 1160502, 1117984, 902900, 1064723, 1044361, 1215599, 1148934, 940277, 1275817, 865272, 1012566, 1178561, 891353, 1056369, 843753, 1148944, 1198461, 1109786],
    ordersNow: [32, 23, 30, 28, 28, 27, 33, 35, 28, 31, 22, 32, 31, 37, 35, 26, 28, 33, 23, 30, 26, 25, 25, 36, 26, 28, 31, 39, 27, 33],
    ordersPrev: [24, 28, 28, 28, 20, 22, 21, 29, 30, 19, 19, 20, 20, 24, 25, 21, 17, 23, 22, 25, 31, 27, 25, 26, 27, 18, 30, 29, 30, 29],
    farmerDays: ['Sat 05/09', 'Sun 06/09', 'Sat 12/09', 'Sun 13/09', 'Sat 19/09', 'Sun 20/09', 'Sat 26/09'],
    farmerRevenueNow: [1180000, 720000, 1340000, 810000, 1520000, 900000, 1980000],
    farmerRevenuePrev: [1050000, 690000, 1120000, 760000, 1260000, 840000, 1430000],
    sparkFarmers: [4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8],
    sparkCustomers: [291, 305, 318, 330, 344, 356, 365, 378, 389, 397, 404, 412],
    sparkMarkets: [2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4],
    sparkOrders: [712, 764, 803, 845, 889, 931, 986, 1042, 1098, 1156, 1221, 1284],
  };


  // Money the platform makes from Farmers. None of this is in the SRS: see the TODOs on
  // farmer/promote.html and admin/pricing.html. Prices are in đồng and sized against a stall that
  // takes roughly 200,000 ₫ on a market morning, so a day pinned on a market page is about 7% of that.
  PT.pricing = {
    currency: '₫',
    lastChanged: '01/09/2026',
    changedBy: 'admin@marketlink.local',
    free: { listingsPerDay: 5, bumpsPerMonth: 10 },
    extras: [
      { key: 'listing', name: 'One listing past the daily five', price: 2000 },
      { key: 'bump', name: 'One bump past the monthly ten', price: 3000 },
    ],
    pins: [
      { key: 'market', name: 'Top of one market page', slots: 3, note: 'Seen by everyone browsing that market', days: [[1, 15000], [3, 35000], [7, 70000]] },
      { key: 'home', name: 'Home page, all four markets', slots: 2, note: 'The scarcest slot on MarketLink', days: [[1, 40000], [3, 100000], [7, 200000]] },
    ],
    bundles: [
      { name: 'Starter', price: 50000, lines: ['30 listings past the daily limit', '10 extra bumps', 'Runs for 30 days'] },
      { name: 'Market', price: 150000, best: true, lines: ['100 listings past the daily limit', '40 extra bumps', '2 days pinned on a market page', 'Runs for 30 days'] },
      { name: 'Season', price: 400000, lines: ['No daily listing limit', '120 bumps', '7 days pinned on a market page', 'Runs for 30 days'] },
    ],
  };

  // What Cô Tư Garden has used this period.
  PT.allowance = {
    listingsUsed: 3, bumpsUsed: 7, credits: 24000,
    pins: [
      { product: 1, where: 'Thảo Điền Weekend Market', until: 'Sat 26/09 · 23:59', spent: 35000, views: 412, added: 9 },
    ],
  };


  // What MarketLink itself earns. Separate from the money customers hand to stalls, which the platform
  // never touches. Sources add up to `total`; bundles are credit, so they are counted where the credit is
  // spent rather than a fifth source (see the TODO on admin/revenue.html).
  PT.platformRevenue = {
    period: 'September 2026',
    comparedWith: 'August 2026',
    total: 2229000,
    totalPrev: 1656000,
    gmv: 31900000,
    gmvPrev: 27690000,
    payingStalls: 5,
    payingStallsPrev: 4,
    approvedStalls: 8,
    dailyNow: [146000, 127000, 151000, 137000, 69000, 15000, 27000, 40000, 112000, 64000, 210000, 10000, 37000, 98000, 10000, 92000, 49000, 194000, 49000, 96000, 136000, 3000, 53000, 14000, 65000, 2000, 112000, 10000, 87000, 14000],
    dailyPrev: [21000, 56000, 5000, 137000, 28000, 26000, 6000, 19000, 21000, 32000, 81000, 20000, 150000, 7000, 13000, 17000, 111000, 89000, 82000, 18000, 23000, 24000, 59000, 69000, 183000, 83000, 64000, 145000, 19000, 48000],
    sources: [
      { name: 'Pinned on a market page', amount: 1190000, prev: 890000, sold: '79 days', stalls: 4 },
      { name: 'Pinned on the home page', amount: 600000, prev: 400000, sold: '15 days', stalls: 2 },
      { name: 'Listings past the daily limit', amount: 256000, prev: 212000, sold: '128 listings', stalls: 3 },
      { name: 'Bumps past the monthly limit', amount: 183000, prev: 154000, sold: '61 bumps', stalls: 4 },
    ],
    byStall: [
      { stall: 'Gió Nam Bakery', spent: 815000, share: 'Pins, mostly the home page', orders: 128 },
      { stall: 'Cô Tư Garden', spent: 604000, share: 'Market-page pins and extra listings', orders: 112 },
      { stall: 'Út Hiền Orchard', spent: 431000, share: 'Market-page pins', orders: 81 },
      { stall: 'U Minh Forest Honey', spent: 259000, share: 'Extra listings and bumps', orders: 46 },
      { stall: 'Ba Lành Farm', spent: 120000, share: 'Bumps', orders: 96 },
    ],
    credit: { boughtThisPeriod: 2450000, spentThisPeriod: 2229000, outstanding: 486000, stallsHolding: 5 },
  };

  // helpers
  PT.market = function (id) { return PT.markets.find(function (m) { return m.id === id; }); };
  PT.farmer = function (id) { return PT.farmers.find(function (f) { return f.id === id; }); };
  PT.product = function (id) { return PT.products.find(function (p) { return p.id === id; }); };
  PT.category = function (id) { return PT.categories.find(function (c) { return c.id === id; }); };
  PT.orderTotal = function (o) { return o.items.reduce(function (a, i) { return a + i.qty * PT.product(i.p).price; }, 0); };
})(window.PT);
