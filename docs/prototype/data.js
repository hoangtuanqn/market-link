/* MarketLink prototype · shared demo data.
   Kept consistent with FR-100..102 (4 markets in HCMC, 10 Farmers, products, orders in all 6 states).
   Anything marked todo: … is not defined by the SRS / decisions and must be confirmed by the team. */
window.PT = window.PT || {};
(function (PT) {
  PT.today = { label: 'Thu 24/09/2026', weekday: 4, date: '24/09/2026' };
  PT.week = [
    { value: 'thu', label: 'Thu', sub: '24/09', dow: 4 },
    { value: 'fri', label: 'Fri', sub: '25/09', dow: 5 },
    { value: 'sat', label: 'Sat', sub: '26/09', dow: 6 },
    { value: 'sun', label: 'Sun', sub: '27/09', dow: 0 },
    { value: 'wed', label: 'Wed', sub: '30/09', dow: 3 },
  ];

  PT.users = {
    customer: { name: 'Khang', full: 'Nguyễn Minh Khang', email: 'khang@example.com', phone: '0903 118 218', address: '25 Xuân Thủy, Thảo Điền, Thủ Đức' },
    farmer: { name: 'Vườn Cô Tư', person: 'Nguyễn Thị Tư', email: 'cotu@example.com', phone: '0912 440 540', address: 'Ấp 3, Tân Phú Trung, Củ Chi' },
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
    { id: 1, stall: 'Vườn Cô Tư', person: 'Nguyễn Thị Tư', phone: '0912 440 540', email: 'cotu@example.com', markets: [1, 2], days: 'Sat, Sun', pickup: '06:00 – 10:30', rating: 4.6, reviews: 32, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8039, lng: 106.7334, stallCode: 'A12', registered: '02/08/2026', about: 'Water spinach, choy sum and herbs from a 2-hectare plot in Củ Chi. Cut the evening before market day.' },
    { id: 2, stall: 'Nhà vườn Út Hiền', person: 'Trần Văn Hiền', phone: '0987 210 031', email: 'uthien@example.com', markets: [2], days: 'Sat, Sun', pickup: '06:00 – 09:30', rating: 4.8, reviews: 21, distance: '4.1 km', approval: 'approved', cutoffHours: 12, lat: 10.8509, lng: 106.7719, stallCode: 'B03', registered: '10/08/2026', about: 'Green-skin pomelo and longan from Bến Tre, picked the day before.' },
    { id: 3, stall: 'Trại dê Củ Chi', person: 'Lê Minh Khang', phone: '0938 776 220', email: 'traide@example.com', markets: [2, 3], days: 'Sat, Sun', pickup: '06:30 – 09:30', rating: 4.4, reviews: 15, distance: '4.1 km', approval: 'approved', cutoffHours: 18, lat: 10.8503, lng: 106.7711, stallCode: 'B07', registered: '12/08/2026', about: 'Goat milk, yogurt and fresh cheese. Pasteurised the morning of market day.' },
    { id: 4, stall: 'Lò bánh Gió Nam', person: 'Phạm Thu Hà', phone: '0908 331 905', email: 'gionam@example.com', markets: [1, 3], days: 'Fri, Sat', pickup: '07:00 – 10:00', rating: 4.9, reviews: 48, distance: '2.4 km', approval: 'approved', cutoffHours: 24, lat: 10.8033, lng: 106.7326, stallCode: 'A04', registered: '15/08/2026', about: 'Sourdough and rye, baked at 5am. Pre-orders are the only way to be sure of a loaf.' },
    { id: 5, stall: 'Trại Ba Lành', person: 'Võ Ba Lành', phone: '0913 002 771', email: 'balanh@example.com', markets: [1], days: 'Fri, Sat, Sun', pickup: '06:00 – 10:30', rating: 4.5, reviews: 19, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8041, lng: 106.7336, stallCode: 'A09', registered: '20/08/2026', about: 'Free-range eggs and green-skin pomelo from Long Khánh.' },
    { id: 6, stall: 'Vườn rau Hóc Môn', person: 'Đặng Thị Mai', phone: '0977 145 620', email: 'raumai@example.com', markets: [4], days: 'Wed, Sat', pickup: '06:00 – 10:00', rating: 4.3, reviews: 11, distance: '5.6 km', approval: 'approved', cutoffHours: 12, lat: 10.8043, lng: 106.6964, stallCode: 'D02', registered: '22/08/2026', about: 'Mustard greens, morning glory and gourds from Hóc Môn.' },
    { id: 7, stall: 'Mật ong Rừng U Minh', person: 'Huỳnh Văn Tài', phone: '0919 880 114', email: 'matong@example.com', markets: [3, 4], days: 'Wed, Sat', pickup: '06:30 – 10:00', rating: 4.7, reviews: 27, distance: '9.8 km', approval: 'approved', cutoffHours: 24, lat: 10.729, lng: 106.7193, stallCode: 'C05', registered: '25/08/2026', about: 'Raw forest honey and bee pollen from U Minh.' },
    { id: 8, stall: 'Nấm sạch Bình Chánh', person: 'Ngô Thị Lan', phone: '0933 456 780', email: 'namlan@example.com', markets: [1, 4], days: 'Fri, Sat', pickup: '06:00 – 10:00', rating: 4.2, reviews: 8, distance: '2.4 km', approval: 'approved', cutoffHours: 12, lat: 10.8031, lng: 106.7329, stallCode: 'A15', registered: '01/09/2026', about: 'Oyster and straw mushrooms grown on rice straw.' },
    { id: 9, stall: 'Bếp bánh Cô Ba', person: 'Lý Thị Ba', phone: '0906 222 410', email: 'coba@example.com', markets: [2], days: 'Sat, Sun', pickup: '06:30 – 09:30', rating: null, reviews: 0, distance: '4.1 km', approval: 'pending', cutoffHours: 12, lat: null, lng: null, stallCode: '', registered: '22/09/2026', about: 'Bánh bò and bánh chuối, steamed on the morning of the market.' },
    { id: 10, stall: 'Vườn trái cây Long Khánh', person: 'Bùi Quốc Thịnh', phone: '0915 668 902', email: 'longkhanh@example.com', markets: [3], days: 'Sat', pickup: '06:00 – 10:00', rating: 3.9, reviews: 6, distance: '9.8 km', approval: 'suspended', cutoffHours: 12, lat: 10.7283, lng: 106.7186, stallCode: 'C11', registered: '05/09/2026', about: 'Durian, rambutan and mangosteen in season.', suspendedReason: 'Repeated no-shows at Phú Mỹ Hưng on 12/09 and 19/09.' },
    { id: 11, stall: 'Sạp rau Chú Bảy', person: 'Nguyễn Văn Bảy', phone: '0907 555 310', email: 'chubay@example.com', markets: [4], days: 'Wed', pickup: '', rating: null, reviews: 0, approval: 'pending', cutoffHours: 12, lat: null, lng: null, stallCode: '', registered: '23/09/2026', about: '' },
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
  ];

  // Orders seen by Customer Khang (FR-101: all 6 states present). One order = one Farmer (D-01).
  PT.orders = [
    { code: '#ML-0421', farmer: 1, market: 1, date: 'Sat 26/09/2026', slot: '07:00–07:30', status: 'placed', cutoff: '19:00 25/09', placedAt: '24/09/2026 09:12', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }, { p: 7, qty: 1 }], history: [['placed', '24/09/2026 09:12', 'You']] },
    { code: '#ML-0412', farmer: 1, market: 1, date: 'Sat 26/09/2026', slot: '07:00–07:30', status: 'accepted', cutoff: '19:00 25/09', placedAt: '23/09/2026 20:41', items: [{ p: 1, qty: 2 }, { p: 2, qty: 1 }, { p: 3, qty: 1 }], history: [['placed', '23/09/2026 20:41', 'You'], ['accepted', '24/09/2026 06:55', 'Vườn Cô Tư']] },
    { code: '#ML-0415', farmer: 2, market: 2, date: 'Sun 27/09/2026', slot: '06:30–07:00', status: 'accepted', cutoff: '18:30 26/09', placedAt: '23/09/2026 21:10', items: [{ p: 8, qty: 2 }], history: [['placed', '23/09/2026 21:10', 'You'], ['accepted', '24/09/2026 07:20', 'Nhà vườn Út Hiền']] },
    { code: '#ML-0409', farmer: 4, market: 1, date: 'Fri 25/09/2026', slot: '07:30–08:00', status: 'ready', cutoff: '07:30 24/09', locked: true, placedAt: '22/09/2026 18:02', items: [{ p: 5, qty: 1 }, { p: 10, qty: 1 }], history: [['placed', '22/09/2026 18:02', 'You'], ['accepted', '22/09/2026 19:30', 'Lò bánh Gió Nam'], ['ready', '24/09/2026 06:10', 'Lò bánh Gió Nam']] },
    { code: '#ML-0398', farmer: 3, market: 2, date: 'Sun 20/09/2026', slot: '08:00–08:30', status: 'completed', cutoff: '14:00 19/09', locked: true, placedAt: '18/09/2026 12:00', items: [{ p: 4, qty: 4 }], reviewed: false, history: [['placed', '18/09/2026 12:00', 'You'], ['accepted', '18/09/2026 14:20', 'Trại dê Củ Chi'], ['ready', '20/09/2026 06:30', 'Trại dê Củ Chi'], ['completed', '20/09/2026 08:14', 'Trại dê Củ Chi']] },
    { code: '#ML-0381', farmer: 1, market: 1, date: 'Sat 19/09/2026', slot: '06:30–07:00', status: 'completed', cutoff: '18:30 18/09', locked: true, placedAt: '17/09/2026 20:05', items: [{ p: 1, qty: 3 }, { p: 19, qty: 2 }], reviewed: true, history: [['placed', '17/09/2026 20:05', 'You'], ['accepted', '17/09/2026 21:00', 'Vườn Cô Tư'], ['ready', '19/09/2026 05:50', 'Vườn Cô Tư'], ['completed', '19/09/2026 06:48', 'Vườn Cô Tư']] },
    { code: '#ML-0402', farmer: 2, market: 2, date: 'Sat 19/09/2026', slot: '07:00–07:30', status: 'declined', cutoff: '19:00 18/09', locked: true, placedAt: '18/09/2026 10:30', items: [{ p: 3, qty: 3 }], reason: 'The stall ran out of pomelo for this weekend.', history: [['placed', '18/09/2026 10:30', 'You'], ['declined', '18/09/2026 16:45', 'Nhà vườn Út Hiền']] },
    { code: '#ML-0377', farmer: 5, market: 1, date: 'Sun 13/09/2026', slot: '08:00–08:30', status: 'cancelled', cutoff: '20:00 12/09', locked: true, placedAt: '11/09/2026 09:00', items: [{ p: 6, qty: 2 }], history: [['placed', '11/09/2026 09:00', 'You'], ['accepted', '11/09/2026 11:15', 'Trại Ba Lành'], ['cancelled', '12/09/2026 07:40', 'You']] },
  ];

  // Incoming orders as seen by Farmer Vườn Cô Tư (FR-065)
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
    { id: 1, author: 'Minh Anh', date: '21/09/2026', target: 'Củ Chi water spinach', targetType: 'product', product: 1, farmer: 1, rating: 5, text: 'Still crisp, and the bunches are bigger than at the market. It was packed and ready at 7 sharp, no waiting.', reply: { by: 'Vườn Cô Tư', date: '21/09/2026', text: 'Thank you. We will have choy sum next week too, do stop by.' } },
    { id: 2, author: 'Lan Hương', date: '20/09/2026', target: 'Vườn Cô Tư', targetType: 'farmer', farmer: 1, rating: 4, text: 'Friendly and quick. One bunch of choy sum was a little wilted by the time I got there at 9.' },
    { id: 3, author: 'Quốc Bảo', date: '14/09/2026', target: 'Choy sum', targetType: 'product', product: 2, farmer: 1, rating: 5, text: 'Sweet stems, no bitterness. Ordered again for this weekend.' },
    { id: 4, author: 'Thu Thảo', date: '13/09/2026', target: 'Goat yogurt', targetType: 'product', product: 4, farmer: 3, rating: 4, text: 'Tangy and thick. Jars are small for the price but the taste is worth it.', reply: { by: 'Trại dê Củ Chi', date: '13/09/2026', text: 'We are testing a 350 ml jar in October.' } },
    { id: 5, author: 'Hồng Nhung', date: '07/09/2026', target: 'Sourdough loaf', targetType: 'product', product: 5, farmer: 4, rating: 5, text: 'Best crust in the city. Pre-ordering means I actually get one.' },
    { id: 6, author: 'Văn Long', date: '06/09/2026', target: 'Vườn Cô Tư', targetType: 'farmer', farmer: 1, rating: 2, text: 'Order was declined the evening before, so I had no greens for the weekend.', reply: { by: 'Vườn Cô Tư', date: '06/09/2026', text: 'Sorry about that. Heavy rain flooded the plot on Friday. We declined early so you could order elsewhere.' } },
    { id: 7, author: 'Anonymous account 4471', date: '02/09/2026', target: 'Raw forest honey', targetType: 'product', product: 14, farmer: 7, rating: 1, text: 'Contact me on Zalo 09xx for cheaper honey, 50 percent off.', flagged: true },
  ];

  PT.notifications = [
    { kind: 'ready', title: 'Order #ML-0409 is ready', text: 'Lò bánh Gió Nam · pick up 07:30–08:00 on Friday 25/09.', time: '06:10', unread: true },
    { kind: 'restock', title: 'Goat yogurt is back in stock', text: 'Trại dê Củ Chi just added 20 jars.', time: 'Yesterday', unread: true },
    { kind: 'accepted', title: 'Order #ML-0412 was accepted', text: 'Vườn Cô Tư confirmed it for Saturday 07:00–07:30.', time: '24/09' },
    { kind: 'accepted', title: 'Order #ML-0415 was accepted', text: 'Nhà vườn Út Hiền confirmed it for Sunday 06:30–07:00.', time: '24/09' },
    { kind: 'announce', title: 'Thảo Điền Weekend Market is closed on Sunday 04/10', text: 'Orders for that day move to Saturday 03/10.', time: '23/09' },
    { kind: 'declined', title: 'Order #ML-0402 was declined', text: 'The stall ran out of pomelo. Nothing to pay.', time: '18/09' },
  ];

  PT.farmerNotifications = [
    { kind: 'placed', title: 'New order #ML-0421 from Minh Anh', text: '3 items · Sat 26/09 · 07:00–07:30. Closes at 19:00 on 25/09.', time: '09:12', unread: true },
    { kind: 'placed', title: 'New order #ML-0420 from Trần Phúc', text: '2 items · Sat 26/09 · 07:30–08:00.', time: '08:40', unread: true },
    { kind: 'cancelled', title: 'Order #ML-0360 was cancelled by Kim Chi', text: '1 bunch of Thai basil went back to stock.', time: '11/09' },
    { kind: 'announce', title: 'Thảo Điền Weekend Market is closed on Sunday 04/10', text: 'Orders for that day move to Saturday 03/10.', time: '23/09' },
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

  // Pickup slots for Vườn Cô Tư at Thảo Điền on Sat 26/09 (D-06: max_orders default 5)
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

  // helpers
  PT.market = function (id) { return PT.markets.find(function (m) { return m.id === id; }); };
  PT.farmer = function (id) { return PT.farmers.find(function (f) { return f.id === id; }); };
  PT.product = function (id) { return PT.products.find(function (p) { return p.id === id; }); };
  PT.category = function (id) { return PT.categories.find(function (c) { return c.id === id; }); };
  PT.orderTotal = function (o) { return o.items.reduce(function (a, i) { return a + i.qty * PT.product(i.p).price; }, 0); };
})(window.PT);
