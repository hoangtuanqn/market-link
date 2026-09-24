/* MarketLink prototype · shared chrome and component builders.
   Mirrors the markup of docs/design-system/reference/marketlink-reference.js (the ml-* classes) in plain JS
   so every screen here matches the design system. Not part of the app build. */
(function (PT) {
  'use strict';

  /* ---------- screens registry: role → [file, title, FR ids] ---------- */
  PT.SCREENS = {
    public: [
      ['home.html', 'Home', 'FR-010 FR-023 FR-077 FR-085'],
      ['markets.html', 'Markets by location and day', 'FR-010 FR-012 FR-014'],
      ['market.html', 'Market page', 'FR-010 FR-011 FR-012 FR-013'],
      ['stall.html', 'Stall profile', 'FR-011 FR-013 FR-040 FR-052'],
      ['products.html', 'Products, filters and sort', 'FR-020 FR-021 FR-084'],
      ['product.html', 'Product detail', 'FR-022 FR-030 FR-040 FR-041 FR-052'],
      ['search.html', 'Search results with map', 'FR-023'],
      ['map.html', 'Market map', 'FR-012 FR-013'],
      ['login.html', 'Sign in', 'FR-003'],
      ['register-customer.html', 'Customer registration', 'FR-001'],
      ['register-farmer.html', 'Farmer registration', 'FR-002 FR-071'],
      ['forgot-password.html', 'Forgot password', 'FR-007'],
      ['reset-password.html', 'Set a new password', 'FR-007'],
      ['about.html', 'About us', 'FR-082'],
      ['contact.html', 'Contact us', 'FR-083'],
      ['feedback.html', 'Feedback form', 'FR-081'],
      ['terms.html', 'Terms of service', 'Proposal · no FR yet'],
      ['privacy.html', 'Privacy policy', 'Proposal · no FR yet'],
    ],
    customer: [
      ['dashboard.html', 'Customer dashboard', 'FR-033 FR-036 FR-040'],
      ['cart.html', 'Cart, split by stall', 'FR-030 FR-031 FR-032'],
      ['order-placed.html', 'Orders placed', 'FR-030 FR-033'],
      ['orders.html', 'My orders and history', 'FR-033 FR-036 FR-037'],
      ['order.html', 'Order detail', 'FR-033 FR-034 FR-035 FR-038'],
      ['order-edit.html', 'Edit order before cutoff', 'FR-035'],
      ['review.html', 'Review stall and products', 'FR-050 FR-051'],
      ['favorites.html', 'Favorites and saved markets', 'FR-014 FR-040 FR-041'],
      ['notifications.html', 'Notifications', 'FR-041 FR-042'],
      ['account.html', 'Account', 'FR-001 FR-006'],
      ['become-farmer.html', 'Apply to sell', 'FR-002 FR-071 · proposal'],
      ['assistant.html', 'Shopping assistant', 'FR-090 FR-091 FR-092'],
      ['settings.html', 'Settings', 'proposal'],
      ['messages.html', 'Messages with a stall', 'Proposal · no FR yet'],
    ],
    farmer: [
      ['overview.html', 'Overview', 'FR-065 FR-068 FR-069'],
      ['orders.html', 'Incoming orders', 'FR-065 FR-066'],
      ['order.html', 'Order detail (Farmer)', 'FR-065 FR-066 FR-038'],
      ['stock-week.html', "This week's stock", 'FR-063 FR-064'],
      ['products.html', 'Products', 'FR-062 FR-064'],
      ['product-form.html', 'Add or edit product', 'FR-062'],
      ['stall-profile.html', 'Stall, markets and pickup', 'FR-060 FR-061 FR-067'],
      ['slots.html', 'Pickup slots', 'FR-032 FR-067'],
      ['history.html', 'Sales history and best sellers', 'FR-069'],
      ['reviews.html', 'Reviews and replies', 'FR-053'],
      ['messages.html', 'Messages with customers', 'Proposal · no FR yet'],
      ['notifications.html', 'Notifications (Farmer)', 'FR-042'],
      ['pending.html', 'Waiting for approval / suspended', 'FR-071'],
      ['promote.html', 'Promote & listing allowance', 'proposal'],
      ['settings.html', 'Settings', 'proposal'],
    ],
    admin: [
      ['login.html', 'Admin sign in', 'FR-004'],
      ['overview.html', 'Admin dashboard', 'FR-070'],
      ['farmers.html', 'Farmer approvals', 'FR-071'],
      ['farmer.html', 'Farmer registration detail', 'FR-071'],
      ['customers.html', 'Customers', 'FR-072'],
      ['customer.html', 'Customer detail', 'FR-072'],
      ['markets.html', 'Markets', 'FR-073'],
      ['market-form.html', 'Add or edit market', 'FR-073'],
      ['moderation.html', 'Moderation', 'FR-074'],
      ['orders.html', 'Orders across the platform', 'FR-070 FR-075'],
      ['order.html', 'Order detail (Admin)', 'FR-070 FR-038'],
      ['revenue.html', 'Platform revenue', 'proposal'],
      ['reports.html', 'Reports', 'FR-075'],
      ['categories.html', 'Categories & units', 'FR-076'],
      ['announcements.html', 'Announcements', 'FR-077'],
      ['feedback.html', 'Feedback inbox', 'FR-081'],
      ['pricing.html', 'Pricing & allowances', 'proposal'],
      ['settings.html', 'Settings', 'proposal'],
      ['account.html', 'Admin profile', 'FR-004'],
    ],
  };
  PT.href = function (role, file) { return '../' + role + '/' + file; };

  /* ---------- formatting (mirrors frontend/src/lib/format.ts) ---------- */
  var UNIT_SAME = { kg: 1, g: 1, dozen: 1 };
  PT.vnd = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫'; };
  /* A stall names its own unit: kg, bunch, bulb, bag, tray of 30. English has no rule that pluralises an
     arbitrary phrase, so a stall can store the plural with the unit; the guess below is only the default the
     form offers. Pass it as the third argument, or set `plural` on the product. */
  PT.pluralise = function (unit, plural) {
    if (plural) return plural;
    if (!unit || UNIT_SAME[unit]) return unit;
    if (unit === 'loaf') return 'loaves';
    if (/(ch|sh|s|x)$/.test(unit)) return unit + 'es';
    if (/[^aeiou]y$/.test(unit)) return unit.slice(0, -1) + 'ies';
    return unit + 's';
  };
  PT.units = function (n, unit, plural) {
    if (!unit) return String(n);
    return n + ' ' + (n === 1 ? unit : PT.pluralise(unit, plural));
  };
  /* "15,000 ₫ / bunch" — the unit always travels with the price */
  PT.perUnit = function (price, unit) { return PT.vnd(price) + ' / ' + esc(unit || 'unit'); };
  var esc = PT.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  PT.dayNames = function (days) { return [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return days.indexOf(d) >= 0; }).map(function (d) { return DOW[d]; }).join(', '); };

  /* ---------- glyphs: 1.75 stroke, currentColor, 16px box ---------- */
  function svg(inner, cls, size) {
    return '<svg viewBox="0 0 16 16" width="' + (size || 16) + '" height="' + (size || 16) + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</svg>';
  }
  var I = PT.icons = {
    placed: function () { return svg('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.2l2 1.3"/>'); },
    accepted: function () { return svg('<path d="M3 8.5l3.2 3L13 4.5"/>'); },
    ready: function () { return svg('<path d="M3 5.5h10l-.8 8H3.8z"/><path d="M5.8 5.5V4.3a2.2 2.2 0 014.4 0v1.2"/>'); },
    completed: function () { return svg('<path d="M1.5 8.5l3 3L10 5"/><path d="M7.5 11.3l.3.2L14.5 5"/>'); },
    declined: function () { return svg('<path d="M4 4l8 8M12 4l-8 8"/>'); },
    cancelled: function () { return svg('<circle cx="8" cy="8" r="6"/><path d="M3.8 12.2l8.4-8.4"/>'); },
    lock: function () { return svg('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>'); },
    clock: function () { return svg('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.2l2 1.3"/>'); },
    check: function () { return svg('<path d="M3 8.5l3.2 3L13 4.5"/>'); },
    close: function () { return svg('<path d="M4 4l8 8M12 4l-8 8"/>'); },
    search: function () { return svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'); },
    cart: function () { return svg('<path d="M1.5 2h2l1.6 8h7.4l1.5-5.5H4.3"/><circle cx="6.5" cy="13" r="1"/><circle cx="11.5" cy="13" r="1"/>'); },
    bell: function () { return svg('<path d="M4 11V7a4 4 0 018 0v4l1.2 1.5H2.8z"/><path d="M6.5 14h3"/>'); },
    menu: function () { return svg('<path d="M2 4h12M2 8h12M2 12h12"/>'); },
    info: function () { return svg('<circle cx="8" cy="8" r="6.25"/><path d="M8 7.2v4"/><path d="M8 4.8v.2"/>', 'ml-icon'); },
    alert: function () { return svg('<path d="M8 1.8l6.5 11.4h-13z"/><path d="M8 6.2v3.3"/><path d="M8 11.4v.1"/>', 'ml-icon'); },
    megaphone: function () { return svg('<path d="M2 6.5v3h2.5l5 3v-9l-5 3z"/><path d="M12 5.5a3.5 3.5 0 010 5"/>', 'ml-icon'); },
    okCircle: function () { return svg('<circle cx="8" cy="8" r="6.25"/><path d="M5.2 8.3l2 1.9 3.6-3.9"/>', 'ml-icon'); },
    restock: function () { return svg('<path d="M13.5 8a5.5 5.5 0 11-1.6-3.9"/><path d="M13.5 2.5v2.8h-2.8"/>'); },
    pin: function () { return svg('<path d="M8 14.5s4.5-4 4.5-7.8a4.5 4.5 0 00-9 0C3.5 10.5 8 14.5 8 14.5z"/><circle cx="8" cy="6.7" r="1.6"/>'); },
    heart: function (f) { return '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="' + (f ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M8 13.5S2 10 2 5.9A3 3 0 018 4.6a3 3 0 016 1.3C14 10 8 13.5 8 13.5z"/></svg>'; },
    star: function (f) { return '<svg viewBox="0 0 16 16" aria-hidden="true" fill="' + (f ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg>'; },
    pencil: function () { return svg('<path d="M11.2 2.3l2.5 2.5L5.5 13H3v-2.5z"/>'); },
    chevronLeft: function () { return svg('<path d="M10 3L5 8l5 5"/>'); },
    fold: function () { return svg('<rect x="2" y="2.6" width="12" height="10.8" rx="1.6"/><path d="M6.4 2.6v10.8"/>'); },
    dashboard: function () { return svg('<rect x="2" y="2" width="5.2" height="5.2" rx="1"/><rect x="8.8" y="2" width="5.2" height="5.2" rx="1"/><rect x="2" y="8.8" width="5.2" height="5.2" rx="1"/><rect x="8.8" y="8.8" width="5.2" height="5.2" rx="1"/>'); },
    box: function () { return svg('<path d="M8 1.8l5.5 3v6.4L8 14.2l-5.5-3V4.8z"/><path d="M2.5 4.8L8 7.8l5.5-3M8 7.8v6.4"/>'); },
    tag: function () { return svg('<path d="M8.3 1.9H14v5.7L7.6 14 2 8.4z"/><circle cx="11" cy="5" r="1"/>'); },
    store: function () { return svg('<path d="M2.6 6.4h10.8v7.1H2.6z"/><path d="M1.6 3.4h12.8l.6 3H1z"/><path d="M6.4 13.5V9.7h3.2v3.8"/>'); },
    users: function () { return svg('<circle cx="6" cy="5.4" r="2.5"/><path d="M1.8 13.6c0-2.3 1.9-4.1 4.2-4.1s4.2 1.8 4.2 4.1"/><path d="M11 3.3a2.5 2.5 0 010 4.6"/><path d="M12.1 9.9c1.3.6 2.1 1.9 2.1 3.7"/>'); },
    shield: function () { return svg('<path d="M8 1.8l5 1.8v4.1c0 3-2.1 5.2-5 6.5-2.9-1.3-5-3.5-5-6.5V3.6z"/><path d="M5.9 7.9l1.6 1.6 3-3.1"/>'); },
    chart: function () { return svg('<path d="M2 13.4h12"/><path d="M4.3 11.2V7.3M7.5 11.2V3.6M10.7 11.2V8.6M13.3 11.2V5.6"/>'); },
    chat: function () { return svg('<path d="M2 3.6h12v7.5H8.2l-3.7 2.6v-2.6H2z"/>'); },
    sliders: function () { return svg('<path d="M2 4.6h12M2 11.4h12"/><circle cx="6" cy="4.6" r="1.8"/><circle cx="10.4" cy="11.4" r="1.8"/>'); },
    out: function () { return svg('<path d="M6.3 2.6H3.4a1.2 1.2 0 00-1.2 1.2v8.4a1.2 1.2 0 001.2 1.2h2.9"/><path d="M10.6 11l3-3-3-3"/><path d="M13.6 8H6.4"/>'); },
    swap: function () { return svg('<path d="M3 5.6h9.4l-2.3-2.3"/><path d="M13 10.4H3.6l2.3 2.3"/>'); },
    trendUp: function () { return svg('<path d="M2.4 11.6L6.4 7.2l2.9 2.9 4.3-4.9"/><path d="M10.6 5.2h3.4v3.3"/>'); },
    trendDown: function () { return svg('<path d="M2.4 4.4L6.4 8.8l2.9-2.9 4.3 4.9"/><path d="M10.6 10.8h3.4V7.5"/>'); },
    download: function () { return svg('<path d="M8 2.4v7.4"/><path d="M5.2 7.2L8 10l2.8-2.8"/><path d="M2.6 12.4h10.8"/>'); },
    chevronRight: function () { return svg('<path d="M6 3l5 5-5 5"/>'); },
    pause: function () { return svg('<path d="M6 3.5v9M10 3.5v9"/>'); },
    play: function () { return svg('<path d="M5.5 3.4l6.2 4.6-6.2 4.6z"/>'); },
    external: function () { return svg('<path d="M9 2.5h4.5V7"/><path d="M13.5 2.5L7 9"/><path d="M12 9.5v4H2.5V4h4"/>'); },
  };
  var LOGO_TAG = 'M9 8.5h14.5a2 2 0 012 2V26a2.5 2.5 0 01-2.5 2.5H9A2.5 2.5 0 016.5 26V11.5zM18.4 13.2a2.4 2.4 0 10-4.8 0 2.4 2.4 0 104.8 0z';
  var LOGO_TWINE = 'M16 13.2C15.2 8.5 12.6 4.6 8 2.6';
  PT.logo = function (size, href, markOnly) {
    var s = size || 32;
    var mark = '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" aria-hidden="true"><path d="' + LOGO_TAG + '" fill="currentColor" fill-rule="evenodd"/><path d="' + LOGO_TWINE + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.2 2"/></svg>';
    var word = markOnly ? '' : '<span class="ml-logo-word">MarketLink</span>';
    return href ? '<a class="ml-logo" href="' + href + '" aria-label="MarketLink — home">' + mark + word + '</a>' : '<span class="ml-logo">' + mark + word + '</span>';
  };

  /* ---------- header / footer / announcement ---------- */
  var NAV = PT.NAV = {
    guest: [['markets', 'Markets', 'public/markets.html'], ['products', 'Products', 'public/products.html'], ['map', 'Map', 'public/map.html'], ['about', 'About us', 'public/about.html']],
    customer: [['markets', 'Markets', 'public/markets.html'], ['products', 'Products', 'public/products.html'], ['map', 'Map', 'public/map.html'], ['orders', 'My orders', 'customer/orders.html'], ['favorites', 'Favorites', 'customer/favorites.html']],
    // A Farmer shops like anyone else, so away from the panel they get the Customer menu (see README, Two shells)
    farmer: [['markets', 'Markets', 'public/markets.html'], ['products', 'Products', 'public/products.html'], ['map', 'Map', 'public/map.html'], ['orders', 'My orders', 'customer/orders.html'], ['favorites', 'Favorites', 'customer/favorites.html']],
    admin: [['overview', 'Overview', 'admin/overview.html'], ['farmers', 'Farmers', 'admin/farmers.html'], ['customers', 'Customers', 'admin/customers.html'], ['markets', 'Markets', 'admin/markets.html'], ['moderation', 'Moderation', 'admin/moderation.html'], ['reports', 'Reports', 'admin/reports.html'], ['settings', 'Settings', 'admin/categories.html']],
  };
  function link(p) { return '../' + p; }
  PT.header = function (o) {
    var role = o.role || 'guest';
    var u = PT.users[role] || {};
    var items = NAV[role];
    var home = role === 'farmer' ? link('farmer/overview.html') : role === 'admin' ? link('admin/overview.html') : link('public/home.html');
    var tools = '';
    if (role !== 'admin') tools += '<a class="ml-hbtn pt-hbtn-search" href="' + link('public/search.html') + '" aria-label="Search">' + I.search() + '</a>';
    if (role !== 'guest') {
      var nhref = role === 'farmer' ? link('farmer/notifications.html') : role === 'admin' ? link('admin/overview.html') : link('customer/notifications.html');
      tools += '<a class="ml-hbtn" href="' + nhref + '" aria-label="Notifications' + (o.unread ? ', ' + o.unread + ' unread' : '') + '">' + I.bell() + (o.unread ? '<span class="ml-hbadge" aria-hidden="true">' + o.unread + '</span>' : '') + '</a>';
    }
    if (role !== 'admin') tools += '<a class="ml-hbtn" href="' + link('customer/cart.html') + '" aria-label="Cart' + (o.cartCount ? ', ' + o.cartCount + ' items' : '') + '">' + I.cart() + (o.cartCount ? '<span class="ml-hbadge" aria-hidden="true">' + o.cartCount + '</span>' : '') + '</a>';
    if (role === 'farmer') tools += '<a class="ml-btn ml-btn-accent ml-btn-sm" href="' + link('farmer/overview.html') + '">Stall panel</a>';
    if (role === 'guest') tools += '<a class="ml-btn ml-btn-accent ml-btn-sm" href="' + link('public/login.html') + '">Sign in</a>';
    else {
      var who = role === 'admin' ? 'Admin' : 'Hi,';
      var acct = role === 'admin' ? link('admin/overview.html') : link('customer/account.html');
      tools += '<a class="ml-huser pt-plain" href="' + acct + '">' + who + ' <b>' + esc(role === 'farmer' ? (u.short || o.userName) : o.userName) + '</b></a>';
    }
    tools += '<button type="button" class="ml-hbtn ml-hmenu" aria-label="Open menu" data-drawer-open>' + I.menu() + '</button>';
    var nav = items.map(function (it) { return '<li><a href="' + link(it[2]) + '"' + (o.active === it[0] ? ' aria-current="page"' : '') + '>' + it[1] + '</a></li>'; }).join('');
    var drawer = '<div class="pt-drawer" data-drawer><div class="pt-drawer-panel"><button type="button" class="ml-btn ml-btn-onboard ml-btn-sm" data-drawer-close>Close</button>' +
      items.map(function (it) { return '<a href="' + link(it[2]) + '"' + (o.active === it[0] ? ' aria-current="page"' : '') + '>' + it[1] + '</a>'; }).join('') +
      (role === 'guest' ? '<a href="' + link('public/login.html') + '">Sign in</a><a href="' + link('public/register-customer.html') + '">Create an account</a>' : '<a href="' + link('public/login.html') + '">Sign out</a>') + '</div></div>';
    return '<header class="ml-header"><div class="ml-header-in">' + PT.logo(30, home) + '<nav aria-label="Main"><ul class="ml-nav">' + nav + '</ul></nav><div class="ml-header-tools">' + tools + '</div></div><div class="ml-header-twine" aria-hidden="true"></div></header>' + drawer;
  };
  PT.footer = function () {
    var cols = [
      ['Shop', [['Markets near you', 'public/markets.html'], ['In season', 'public/products.html'], ['Market map', 'public/map.html'], ['Favorite stalls', 'customer/favorites.html']]],
      ['Sell', [['Register as a Farmer', 'public/register-farmer.html'], ['Handling pre-orders', 'farmer/orders.html'], ['Stall guidelines', 'public/about.html']]],
      ['MarketLink', [['About us', 'public/about.html'], ['Contact us', 'public/contact.html'], ['Feedback & bug reports', 'public/feedback.html'], ['Terms of service', 'public/terms.html'], ['Privacy policy', 'public/privacy.html'], ['Sitemap', '../index.html']]],
    ];
    return '<footer class="ml-footer"><div class="ml-footer-in"><div>' + PT.logo(30) + '<p>Pre-order from your local farmers market, pick up at the stall. Pay the Farmer directly at pickup.</p></div>' +
      cols.map(function (c) { return '<div><h2>' + c[0] + '</h2><ul>' + c[1].map(function (l) { return '<li><a href="' + (l[1].indexOf('..') === 0 ? l[1] : link(l[1])) + '">' + l[0] + '</a></li>'; }).join('') + '</ul></div>'; }).join('') +
      '<div class="ml-footer-base"><span>© 2026 MarketLink · TechWiz 7</span><span>Map data © OpenStreetMap contributors</span></div></div></footer>';
  };
  /* `action` is the design system's slot and it holds ONE BUTTON (see components/Banner.md). A long
     note belongs in `todo`, which goes inside the body: the banner is a flex row that does not wrap,
     so anything wide beside the body starves it to zero width on a 375px screen. */
  PT.banner = function (tone, title, text, o) {
    o = o || {};
    var icon = tone === 'announce' ? I.megaphone() : tone === 'info' ? I.info() : I.alert();
    return '<div class="ml-banner ml-banner-' + tone + (o.className ? ' ' + o.className : '') + '" role="' + (tone === 'danger' ? 'alert' : 'status') + '">' + icon + '<div class="ml-banner-body">' + (title ? '<p class="ml-banner-title">' + title + '</p>' : '') + (text ? '<p class="ml-banner-text">' + text + '</p>' : '') + (o.todo ? '<div class="pt-banner-todo">' + o.todo + '</div>' : '') + '</div>' + (o.action || '') + (o.close ? '<button type="button" class="ml-banner-close" aria-label="Dismiss" data-dismiss>' + I.close() + '</button>' : '') + '</div>';
  };

  /* ---------- components ---------- */
  var STATUS = PT.STATUS = { placed: 'Placed', accepted: 'Accepted', ready: 'Ready for pickup', completed: 'Completed', declined: 'Declined', cancelled: 'Cancelled' };
  PT.status = function (s, label) { s = STATUS[s] ? s : 'placed'; return '<span class="ml-status ml-status-' + s + '">' + I[s]() + '<span class="ml-status-text">' + (label || STATUS[s]) + '</span></span>'; };
  PT.priceTag = function (amount, unit, was, lg) { return '<span class="ml-price' + (lg ? ' ml-price-lg' : '') + '"><span class="ml-price-amt">' + PT.vnd(amount) + '</span>' + (unit ? '<span class="ml-price-unit">/ ' + unit + '</span>' : '') + (was ? '<span class="ml-price-was"><span class="ml-sr">Was </span>' + PT.vnd(was) + '</span>' : '') + '</span>'; };
  PT.rating = function (v, count) {
    v = v || 0; var stars = '';
    for (var i = 1; i <= 5; i++) stars += '<span>' + I.star(v >= i - 0.25) + '</span>';
    return '<span class="ml-rating"><span class="ml-rating-stars" aria-hidden="true">' + stars + '</span><span class="ml-rating-num" aria-hidden="true">' + v.toFixed(1) + '</span>' + (count != null ? '<span class="ml-muted" aria-hidden="true">(' + count + ' reviews)</span>' : '') + '<span class="ml-sr">' + v + ' out of 5 stars' + (count != null ? ', ' + count + ' reviews' : '') + '</span></span>';
  };
  var RATE_WORDS = ['not rated', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  PT.ratingInput = function (legend, name, value) {
    var out = '';
    for (var n = 5; n >= 1; n--) out += '<input type="radio" id="' + name + '-' + n + '" name="' + name + '" value="' + n + '"' + (value === n ? ' checked' : '') + '><label for="' + name + '-' + n + '" title="' + RATE_WORDS[n] + '">' + I.star(false) + '<span class="ml-sr">' + n + (n === 1 ? ' star — ' : ' stars — ') + RATE_WORDS[n] + '</span></label>';
    return '<fieldset class="ml-rate" data-rate><legend>' + legend + '</legend><div class="ml-rate-line"><div class="ml-rate-row">' + out + '</div><span class="ml-rate-hint" aria-live="polite">' + RATE_WORDS[value || 0] + '</span></div></fieldset>';
  };
  PT.productCard = function (p, o) {
    o = o || {};
    var f = PT.farmer(p.farmer), cat = PT.category(p.cat);
    var soldOut = p.status !== 'available' || p.stock === 0;
    var low = !soldOut && p.stock <= 3;
    var href = o.href || link('public/product.html');
    var stock = soldOut ? (p.status === 'unavailable' ? 'Not this week' : 'Back soon') : (low ? 'Only ' : '') + PT.units(p.stock, p.unit, p.plural) + ' left';
    var market = o.market === false ? '' : ' · ' + PT.market(f.markets[0]).name;
    return '<article class="ml-card ml-pcard' + (soldOut ? ' ml-pcard-soldout' : '') + (o.fluid !== false ? ' ml-pcard-fluid' : '') + '">' +
      '<div class="ml-pcard-img"><span class="ml-pcard-cat ml-label">' + cat.name + '</span>' + (p.flag && !soldOut ? '<span class="ml-pcard-flag ml-label">' + p.flag + '</span>' : '') + (soldOut ? '<span class="ml-pcard-flag ml-pcard-flag-out ml-label">' + (p.status === 'unavailable' ? 'Paused' : 'Sold out') + '</span>' : '') +
      '<button type="button" class="ml-pcard-fav" aria-pressed="' + (p.favorite ? 'true' : 'false') + '" aria-label="' + (p.favorite ? 'Remove from favorites: ' : 'Add to favorites: ') + esc(p.name) + '" data-fav data-name="' + esc(p.name) + '">' + I.heart(p.favorite) + '</button></div>' +
      '<div class="ml-pcard-body"><h3 class="ml-pcard-name"><a class="pt-plain" href="' + href + '">' + esc(p.name) + '</a></h3><p class="ml-pcard-meta">' + esc(f.stall) + market + '</p>' +
      '<div class="ml-pcard-foot">' + PT.priceTag(p.price, p.unit, p.was) + '<span class="ml-pcard-stock' + (low ? ' ml-pcard-stock-low' : '') + '">' + stock + '</span></div>' +
      (soldOut ? '<button type="button" class="ml-btn ml-btn-secondary ml-btn-sm" data-toast="We will tell you when ' + esc(p.name) + ' is back.">Notify me when back</button>' : '<button type="button" class="ml-btn ml-btn-primary ml-btn-sm" data-toast="Added ' + esc(p.name) + ' to your cart." data-toast-action="Undo">Add to cart</button>') +
      '</div></article>';
  };
  PT.stallCard = function (f, o) {
    o = o || {};
    var mono = (f.stall || '?').trim().charAt(0);
    var m = PT.market(f.markets[0]);
    return '<article class="ml-card ml-stall' + (o.className ? ' ' + o.className : '') + '"><div class="ml-stall-mono" aria-hidden="true">' + mono + '</div><div><h3 class="ml-stall-name"><a class="pt-plain" href="' + link('public/stall.html') + '">' + esc(f.stall) + '</a></h3><p class="ml-stall-person">' + esc(f.person) + '</p>' + (f.rating != null ? '<div style="margin-top:6px">' + PT.rating(f.rating, f.reviews) + '</div>' : '') + '</div>' +
      '<dl class="ml-stall-facts"><dt>Markets</dt><dd>' + f.markets.map(function (id) { return esc(PT.market(id).name); }).join(', ') + '</dd><dt>Market days</dt><dd>' + f.days + '</dd><dt>Pickup</dt><dd>' + f.pickup + '</dd>' + (f.distance ? '<dt>Distance</dt><dd>' + f.distance + '</dd>' : '') + '</dl>' +
      '<div class="ml-stall-actions"><a class="ml-btn ml-btn-primary ml-btn-sm" href="' + link('public/stall.html') + '">See stall &amp; this week\'s stock</a><a class="ml-btn ml-btn-ghost ml-btn-sm" href="' + PT.directions(f.lat || m.lat, f.lng || m.lng) + '" target="_blank" rel="noopener">Directions</a></div></article>';
  };
  var WEEK = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
  PT.dayCells = function (open) { return '<ul class="ml-market-days" aria-label="Market days">' + WEEK.map(function (d) { var on = open.indexOf(d[1]) >= 0; return '<li data-open="' + on + '">' + d[0] + '<span class="ml-sr">' + (on ? ' open' : ' closed') + '</span></li>'; }).join('') + '</ul>'; };
  PT.marketCard = function (m, o) {
    o = o || {};
    return '<article class="ml-card ml-market"><div><h3 class="ml-market-name"><a class="pt-plain" href="' + link('public/market.html') + '">' + esc(m.name) + '</a></h3><p class="ml-market-addr">' + esc(m.address) + '</p></div>' +
      '<button type="button" class="ml-pcard-fav ml-market-save" style="position:static" aria-pressed="' + (m.saved ? 'true' : 'false') + '" aria-label="' + (m.saved ? 'Unsave ' : 'Save ') + esc(m.name) + '" data-fav data-name="' + esc(m.name) + '" data-fav-kind="market">' + I.heart(m.saved) + '</button>' +
      PT.dayCells(m.days) +
      '<p class="ml-market-meta"><span>Hours <b>' + m.open + '–' + m.close + '</b></span><span><b>' + m.stalls + '</b> stalls</span>' + (o.distance !== false && m.distance ? '<span><b>' + m.distance + '</b> away</span>' : '') + '</p>' +
      '<div class="ml-market-actions"><a class="ml-btn ml-btn-primary ml-btn-sm" href="' + link('public/market.html') + '">See stalls</a><a class="ml-btn ml-btn-ghost ml-btn-sm" href="' + PT.directions(m.lat, m.lng) + '" target="_blank" rel="noopener">Directions</a></div></article>';
  };
  PT.reviewCard = function (r, o) {
    o = o || {};
    return '<article class="ml-card ml-review' + (o.fluid ? ' pt-fluid' : '') + '"' + (o.fluid ? ' style="width:auto"' : '') + '><div class="ml-review-head"><div class="ml-review-who"><span class="ml-review-author">' + esc(r.author) + '</span>' + (r.verified !== false ? '<span class="ml-review-verified">' + I.check() + 'Verified purchase</span>' : '') + '</div><span class="ml-review-meta">' + r.date + (r.target ? ' · ' + esc(r.target) : '') + '</span></div>' +
      PT.rating(r.rating) + '<p class="ml-review-text">' + esc(r.text) + '</p>' +
      (r.reply ? '<div class="ml-review-reply"><b>' + esc(r.reply.by) + ' replied · ' + r.reply.date + '</b>' + esc(r.reply.text) + '</div>' : '') +
      (o.actions ? '<div class="ml-ticket-actions">' + o.actions + '</div>' : '') + '</article>';
  };
  PT.qty = function (v, max, unit, label, min) {
    min = min == null ? 1 : min;
    return '<span class="ml-qty-wrap" data-qty data-max="' + max + '" data-min="' + min + '" data-unit="' + esc(unit) + '"><span class="ml-qty" role="group" aria-label="Quantity ' + esc(label || '') + '"><button type="button" aria-label="Decrease by 1"' + (v <= min ? ' disabled' : '') + ' data-dec>−</button><output aria-live="polite">' + v + '</output><button type="button" aria-label="Increase by 1"' + (v >= max ? ' disabled' : '') + ' data-inc>+</button></span><span class="ml-qty-note">' + (v >= max ? 'Max ' + PT.units(max, unit) : PT.units(max, unit) + ' left') + '</span></span>';
  };
  PT.cartGroup = function (g) {
    var total = g.items.reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    return '<section class="ml-card ml-cart" style="width:auto" aria-label="Order at ' + esc(g.stallName) + '" data-cart-group><div class="ml-cart-head"><div>' + (g.index ? '<div class="ml-cart-no ml-label">Order ' + g.index + (g.of ? ' of ' + g.of : '') + '</div>' : '') + '<h3 class="ml-cart-stall">' + esc(g.stallName) + '</h3><p class="ml-cart-where">' + esc(g.market) + (g.pickup ? ' · ' + g.pickup : '') + '</p></div>' +
      (g.slotHref ? '<a class="ml-btn ml-btn-ghost ml-btn-sm" href="' + g.slotHref + '">' + (g.pickup ? 'Change pickup time' : 'Choose pickup time') + '</a>' : '') + '</div>' +
      '<ul class="ml-cart-items">' + g.items.map(function (i) { return '<li class="ml-cart-item" data-price="' + i.price + '"><span class="ml-cart-item-name">' + esc(i.name) + '<span class="ml-cart-item-unit">' + PT.vnd(i.price) + ' / ' + i.unit + '</span>' + (g.removable !== false ? ' <button type="button" class="ml-btn ml-btn-ghost ml-btn-sm" data-remove-item>Remove</button>' : '') + '</span>' + PT.qty(i.qty, i.max, i.unit, i.name) + '<span class="ml-cart-item-sum">' + PT.vnd(i.qty * i.price) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="ml-cart-foot"><span class="ml-muted" style="font-size:14px">Pay at the stall on pickup</span><span class="ml-cart-total" data-group-total>' + PT.vnd(total) + '</span></div></section>';
  };
  PT.orderTicket = function (o, opt) {
    opt = opt || {};
    var f = PT.farmer(o.farmer), m = PT.market(o.market);
    var total = PT.orderTotal(o);
    var editable = !o.locked && (o.status === 'placed' || o.status === 'accepted');
    var cut = o.cutoff ? '<p class="ml-ticket-cut">' + (o.locked ? I.lock() : I.clock()) + '<span>' + (o.locked ? 'Cutoff passed at ' + o.cutoff + '. To change it, contact the stall directly.' : 'Edit or cancel before ' + o.cutoff + '. After that the order is locked.') + '</span></p>' : '';
    var actions = '';
    if (editable) actions = '<div class="ml-ticket-actions"><a class="ml-btn ml-btn-secondary ml-btn-sm" href="' + link('customer/order-edit.html') + '">Edit order</a><button type="button" class="ml-btn ml-btn-danger ml-btn-sm" data-dialog="cancel-' + o.code.replace('#', '') + '">Cancel order</button></div>';
    if (o.status === 'completed') actions = '<div class="ml-ticket-actions">' + (o.reviewed ? '<span class="ml-muted pt-small">You reviewed this order</span>' : '<a class="ml-btn ml-btn-primary ml-btn-sm" href="' + link('customer/review.html') + '">Review stall &amp; products</a>') + '<button type="button" class="ml-btn ml-btn-ghost ml-btn-sm" data-toast="Added ' + o.items.length + ' items to your cart at today\'s prices and stock.">Reorder</button></div>';
    if (o.status === 'declined' && o.reason) cut = '<p class="ml-ticket-cut">' + I.declined() + '<span>Reason from the stall: ' + esc(o.reason) + ' Nothing to pay.</span></p>';
    if (o.status === 'cancelled') cut = '<p class="ml-ticket-cut">' + I.cancelled() + '<span>You cancelled this order before the cutoff. Stock went back to the stall.</span></p>';
    return '<article class="ml-card ml-ticket"' + (opt.fluid ? ' style="width:auto"' : '') + '><div class="ml-ticket-head"><div><div class="ml-ticket-id ml-label">Order ' + o.code + '</div><h3 class="ml-ticket-stall"><a class="pt-plain" href="' + (opt.href || link('customer/order.html')) + '">' + esc(f.stall) + '</a></h3></div>' + PT.status(o.status) + '</div>' +
      '<dl class="ml-ticket-pick"><dt>Market</dt><dd>' + esc(m.name) + '</dd><dt>Pickup</dt><dd>' + o.date + ' · ' + o.slot + '</dd></dl><div class="ml-ticket-perf" aria-hidden="true"></div>' +
      '<ul class="ml-ticket-items">' + o.items.map(function (i) { var p = PT.product(i.p); return '<li><span><span class="q">' + i.qty + '×</span>' + esc(p.name) + '</span><span class="p">' + PT.vnd(i.qty * p.price) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="ml-ticket-total"><span>Pay on pickup</span><span class="p">' + PT.vnd(total) + '</span></div>' + cut + actions + (opt.children || '') + '</article>';
  };
  PT.statTile = function (label, value, note, hl) { return '<div class="ml-card ml-stat' + (hl ? ' ml-stat-hl' : '') + '"><span class="ml-stat-label ml-overline">' + label + '</span><span class="ml-stat-value">' + value + '</span>' + (note ? '<span class="ml-stat-note">' + note + '</span>' : '') + '</div>'; };
  PT.table = function (caption, cols, rows, o) {
    o = o || {};
    return '<div class="ml-table-wrap"' + (o.id ? ' id="' + o.id + '"' : '') + '><table class="ml-table">' + (caption ? '<caption>' + caption + '</caption>' : '') + '<thead><tr>' + cols.map(function (c) { return '<th scope="col"' + (c.align ? ' class="' + c.align + '"' : '') + '>' + c.label + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr' + (r._new ? ' data-new="true"' : '') + (r._attrs || '') + '>' + cols.map(function (c) { return '<td' + (c.align ? ' class="' + c.align + '"' : '') + '>' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  };
  PT.pagination = function (page, pages) {
    var list = [];
    for (var i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i); else if (list[list.length - 1] !== '…') list.push('…'); }
    return '<nav aria-label="Pagination"><ul class="ml-pages"><li><button type="button"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button></li>' + list.map(function (n) { return n === '…' ? '<li class="gap" aria-hidden="true">…</li>' : '<li><button type="button"' + (n === page ? ' aria-current="page"' : '') + ' aria-label="Page ' + n + '">' + n + '</button></li>'; }).join('') + '<li><button type="button"' + (page >= pages ? ' disabled' : '') + ' aria-label="Next page">›</button></li></ul></nav>';
  };
  PT.tabs = function (label, tabs, value) {
    return '<div class="ml-tabs" role="tablist" aria-label="' + label + '" data-tabs>' + tabs.map(function (t) { var sel = t.id === value; return '<button type="button" role="tab" class="ml-tab" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" data-tab="' + t.id + '">' + t.label + (t.count != null ? '<span class="ml-tab-count">' + t.count + '</span>' : '') + '</button>'; }).join('') + '</div>';
  };
  /* Which tab a strip is on, so a screen that redraws itself can put the reader back where they were.
     Screens that move a record between tabs keep their rows in memory and redraw from them; nothing is
     stored, so a reload gives the seeded data back. */
  PT.activeTab = function (el, fallback) {
    var b = el && el.querySelector('[data-tab][aria-selected="true"]');
    return (b && b.getAttribute('data-tab')) || fallback;
  };
  /* The sidebar badge is seeded as a constant, so a screen that works through its own queue has to say
     so, or the tab reads 0 while the sidebar still claims there is work waiting. */
  PT.sideCount = function (file, n) {
    var a = document.querySelector('.pt-side-link[href$="' + file + '"]');
    if (!a) return;
    var b = a.querySelector('.pt-side-count');
    if (!n) { if (b) b.remove(); return; }
    if (b) b.textContent = n; else a.insertAdjacentHTML('beforeend', '<span class="pt-side-count">' + n + '</span>');
  };
  PT.chip = function (label, o) { o = o || {}; return '<button type="button" class="ml-chip" aria-pressed="' + (o.selected ? 'true' : 'false') + '" data-chip' + (o.radio ? ' data-chip-group="' + o.radio + '"' : '') + '>' + (o.selected ? I.check() : '') + label + (o.count != null ? '<span class="ml-chip-count">' + o.count + '</span>' : '') + '</button>'; };
  PT.dayChips = function (legend, days, value, name) {
    name = name || 'market-day';
    return '<fieldset class="ml-days">' + (legend ? '<legend>' + legend + '</legend>' : '') + days.map(function (d) { return '<label class="ml-day"><input type="radio" name="' + name + '" value="' + d.value + '"' + (d.disabled ? ' disabled' : '') + (value === d.value ? ' checked' : '') + '><span>' + d.label + (d.sub ? '<small>' + d.sub + '</small>' : '') + '</span></label>'; }).join('') + '</fieldset>';
  };
  PT.slotPicker = function (legend, slots, value, name) {
    name = name || 'pickup-slot';
    return '<fieldset class="ml-slots" data-slots>' + (legend ? '<legend>' + legend + '</legend>' : '') + slots.map(function (s) { var full = s.booked >= s.max; return '<label class="ml-slot"><input type="radio" name="' + name + '" value="' + s.value + '"' + (full ? ' disabled' : '') + (value === s.value ? ' checked' : '') + '><span><b>' + s.time + '</b><small>' + (full ? 'Fully booked' : (s.max - s.booked) + ' of ' + s.max + ' left') + '</small></span></label>'; }).join('') + '</fieldset>';
  };
  PT.checkbox = function (label, o) { o = o || {}; return '<label class="ml-check"><input type="checkbox"' + (o.checked ? ' checked' : '') + (o.disabled ? ' disabled' : '') + (o.name ? ' name="' + o.name + '"' : '') + (o.value ? ' value="' + esc(o.value) + '"' : '') + '><span class="ml-check-box" aria-hidden="true">' + I.check() + '</span><span class="ml-check-text">' + label + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</span></label>'; };
  var fid = 0;
  PT.field = function (o) {
    var id = o.id || 'f' + (++fid);
    var tag = o.as || 'input';
    var attrs = ' id="' + id + '" class="ml-input"' + (o.name ? ' name="' + o.name + '"' : '') + (o.type ? ' type="' + o.type + '"' : '') + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.value != null && tag !== 'textarea' ? ' value="' + esc(o.value) + '"' : '') + (o.required ? ' required' : '') + (o.disabled ? ' disabled' : '') + (o.readonly ? ' readonly' : '') + (o.attrs || '');
    var desc = []; if (o.hint) desc.push(id + '-h'); if (o.error) desc.push(id + '-e');
    if (desc.length) attrs += ' aria-describedby="' + desc.join(' ') + '"';
    if (o.error) attrs += ' aria-invalid="true"';
    var control = tag === 'textarea' ? '<textarea' + attrs + '>' + esc(o.value || '') + '</textarea>' : tag === 'select' ? '<select' + attrs + '>' + (o.options || []).map(function (op) { var v = Array.isArray(op) ? op[0] : op, l = Array.isArray(op) ? op[1] : op; return '<option value="' + esc(v) + '"' + (o.value === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>' : '<input' + attrs + '>';
    return '<div class="ml-field' + (o.error ? ' ml-field-error' : '') + (o.className ? ' ' + o.className : '') + '"><label class="ml-field-label" for="' + id + '">' + o.label + (o.required ? '<span class="ml-field-req" aria-hidden="true">*</span>' : '') + '</label>' + control + (o.hint ? '<span id="' + id + '-h" class="ml-field-hint">' + o.hint + '</span>' : '') + (o.error ? '<span id="' + id + '-e" class="ml-field-err" role="alert">' + o.error + '</span>' : '') + '</div>';
  };
  /* FR-084: every data block shows loading, empty, error or data. A screen has the loaded block
     already, so PT.states takes that block, puts the other three beside it, and adds one switcher at
     the foot of the page so all four can be seen without a server behind the screen. The switcher is
     scaffolding for review, not product UI — the real app picks a state from the request.
     Pass several selectors when a screen has more than one block; they switch together, which is what
     a whole screen loading or failing actually looks like. */
  PT.states = function (sel, o) {
    o = o || {};
    var list = (Array.isArray(sel) ? sel : [sel]).map(function (s) { return typeof s === 'string' ? document.querySelector(s) : s; }).filter(Boolean);
    if (!list.length) return;
    var emptyAction = o.emptyAction || '';
    var err = o.error || ["Couldn't load this", 'Check your connection and try again.'];
    list.forEach(function (el, i) {
      el.setAttribute('data-state-target', 'loaded');
      // only the first block carries the empty and error copy; the rest just blank out with it
      el.insertAdjacentHTML('afterend',
        '<div hidden data-state-target="loading">' + PT.state('loading', o.loadingLabel || 'Loading') + '</div>' +
        (i ? '' :
          '<div hidden data-state-target="empty">' + PT.state('empty', o.empty[0], o.empty[1], emptyAction) + '</div>' +
          '<div hidden data-state-target="error">' + PT.state('error', err[0], err[1], '<button type="button" class="ml-btn ml-btn-danger ml-btn-sm">Try again</button>') + '</div>'));
    });
    var main = list[0].closest('main') || document.querySelector('main');
    if (!main || main.querySelector('[data-state-demo]')) return;
    main.insertAdjacentHTML('beforeend',
      '<section class="pt-section"><h2 class="pt-h3">Other states of ' + (o.label || 'this screen') + ' (FR-084)</h2>' +
      '<div class="pt-row-2">' +
      [['loaded', 'With data'], ['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error']].map(function (s) {
        return '<button type="button" class="ml-chip" aria-pressed="' + (s[0] === 'loaded') + '" data-state-demo="' + s[0] + '">' + s[1] + '</button>';
      }).join('') + '</div></section>');
  };
  PT.state = function (kind, title, text, action) {
    if (kind === 'loading') return '<div class="ml-card ml-state" role="status" aria-live="polite"><span class="ml-sr">' + (title || 'Loading') + '</span><span class="ml-skel" style="width:60%;height:20px"></span><span class="ml-skel" style="width:90%;height:14px"></span><span class="ml-skel" style="width:75%;height:14px"></span></div>';
    return '<div class="ml-state ml-state-' + kind + '"' + (kind === 'error' ? ' role="alert"' : '') + '><h3 class="ml-state-title">' + title + '</h3>' + (text ? '<p class="ml-state-text">' + text + '</p>' : '') + (action || '') + '</div>';
  };
  PT.skeletonCards = function (n) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="ml-card ml-state" role="status" aria-live="polite"><span class="ml-sr">Loading</span><span class="ml-skel" style="width:100%;aspect-ratio:4/3"></span><span class="ml-skel" style="width:70%;height:18px"></span><span class="ml-skel" style="width:45%;height:14px"></span><span class="ml-skel" style="width:35%;height:28px"></span></div>'; return s; };
  var NOTE_STYLE = { accepted: ['accepted', 'status-accepted'], declined: ['declined', 'status-declined'], ready: ['ready', 'status-ready'], restock: ['restock', 'brand-tint'], announce: ['megaphone', 'highlight'], invite: ['store', 'brand-tint'], placed: ['placed', 'status-placed'], cancelled: ['cancelled', 'status-cancelled'] };
  PT.notes = function (items, o) {
    o = o || {};
    var unread = items.filter(function (n) { return n.unread; }).length;
    return '<section class="ml-notes"' + (o.fluid ? ' style="width:100%;box-shadow:none"' : '') + ' aria-label="Notifications"><div class="ml-notes-head"><b>Notifications' + (unread ? '<span class="ml-muted" style="font-weight:400;font-size:14px"> · ' + unread + ' unread</span>' : '') + '</b><button type="button" class="ml-btn ml-btn-ghost ml-btn-sm" data-read-all>Mark all as read</button></div><ul>' +
      items.map(function (n) { var s = NOTE_STYLE[n.kind] || NOTE_STYLE.announce; var bg = s[1].indexOf('status-') === 0 ? 'var(--' + s[1] + '-bg)' : 'var(--' + s[1] + ')'; var fg = s[1].indexOf('status-') === 0 ? 'var(--' + s[1] + '-ink)' : 'var(--ink)'; return '<li class="ml-note" data-unread="' + (n.unread ? 'true' : 'false') + '"><span class="ml-note-ico" style="background:' + bg + ';color:' + fg + '">' + I[s[0]]() + '</span><div><p class="ml-note-title">' + esc(n.title) + (n.unread ? '<span class="ml-note-dot"><span class="ml-sr">unread</span></span>' : '') + '</p>' + (n.text ? '<p class="ml-note-text">' + esc(n.text) + '</p>' : '') + '</div><span class="ml-note-time">' + n.time + '</span></li>'; }).join('') + '</ul></section>';
  };
  PT.chat = function (m) {
    var bot = m.from !== 'user';
    var who = m.who || (bot ? 'MarketLink assistant' : 'You');
    return '<div class="ml-msg ' + (bot ? 'ml-msg-bot' : 'ml-msg-user') + '"><div class="ml-msg-bubble">' + m.text + '</div><div class="ml-msg-meta">' + esc(who) + (m.time ? '<span>· ' + m.time + '</span>' : '') + (m.intent ? '<span class="ml-msg-intent">Intent: ' + m.intent + '</span>' : '') + '</div>' + (m.suggestions ? '<div class="ml-msg-suggest">' + m.suggestions.map(function (s) { return '<button type="button" class="ml-chip" aria-pressed="false" data-suggest>' + s + '</button>'; }).join('') + '</div>' : '') + '</div>';
  };
  PT.todo = function (text) { return '<span class="pt-todo" data-todo>' + text + '</span>'; };

  /* ---------- map: Leaflet + OSM (D-12), pins via ml-pin markup ---------- */
  PT.pinHTML = function (kind, label, text, selected) {
    var k = kind === 'stall' ? 'stall' : 'market';
    return '<span class="ml-pin ml-pin-' + k + (selected ? ' ml-pin-selected' : '') + '"><span class="ml-pin-head">' + esc(text || (k === 'market' ? 'M' : 'S')) + '</span><span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' + (label ? '<span class="ml-pin-label">' + esc(label) + '</span>' : '') + '</span>';
  };
  PT.pin = function (kind, label, text, selected) { return '<span role="img" aria-label="' + (kind === 'stall' ? 'Stall: ' : 'Market: ') + esc(label || '') + '">' + PT.pinHTML(kind, label, text, selected) + '</span>'; };
  PT.directions = function (lat, lng) { return 'https://www.openstreetmap.org/directions?to=' + lat + '%2C' + lng; };
  PT.map = function (el, o) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return null;
    el.classList.add('pt-map');
    if (!window.L) { el.insertAdjacentHTML('beforeend', '<div class="pt-map-note">Map tiles need a connection (Leaflet + OpenStreetMap)</div>'); return null; }
    var inner = document.createElement('div'); el.appendChild(inner);
    var map = L.map(inner, { scrollWheelZoom: o.scroll !== false, zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    var bounds = [];
    (o.markers || []).forEach(function (mk) {
      var icon = L.divIcon({ html: PT.pinHTML(mk.kind, mk.label, mk.text, mk.selected), className: '', iconSize: [34, 48], iconAnchor: [17, 48], popupAnchor: [0, -46] });
      var m = L.marker([mk.lat, mk.lng], { icon: icon, title: mk.title || mk.label || '' }).addTo(map);
      if (mk.popup) m.bindPopup(mk.popup);
      if (mk.open) m.openPopup();
      bounds.push([mk.lat, mk.lng]);
    });
    if (o.center) map.setView(o.center, o.zoom || 13);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0], o.zoom || 15);
    else map.setView([10.79, 106.72], 11);
    setTimeout(function () { map.invalidateSize(); }, 50);
    return map;
  };
  PT.popup = function (title, lines, lat, lng, href) { return '<b>' + esc(title) + '</b>' + (lines || []).map(function (l) { return '<span>' + l + '</span><br>'; }).join('') + (href ? '<a href="' + href + '">Open</a>' : '') + '<a href="' + PT.directions(lat, lng) + '" target="_blank" rel="noopener">Directions</a>'; };

  /* ---------- toasts and dialogs ---------- */
  PT.toast = function (text, o) {
    o = o || {};
    var host = document.querySelector('.pt-toasts'); if (!host) { host = document.createElement('div'); host.className = 'pt-toasts'; document.body.appendChild(host); }
    var t = document.createElement('div'); t.className = 'ml-toast' + (o.tone === 'error' ? ' ml-toast-error' : ''); t.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
    t.innerHTML = (o.tone === 'error' ? I.alert() : I.okCircle()) + '<span class="ml-toast-text">' + text + '</span>' + (o.action ? '<button type="button" class="ml-toast-action">' + o.action + '</button>' : '');
    host.appendChild(t);
    var btn = t.querySelector('.ml-toast-action'); if (btn) btn.addEventListener('click', function () { t.remove(); });
    if (o.tone !== 'error') setTimeout(function () { t.remove(); }, 5000);
  };
  PT.dialog = function (o) {
    var scrim = document.createElement('div'); scrim.className = 'ml-scrim';
    scrim.innerHTML = '<div class="ml-dialog" role="' + (o.tone === 'danger' ? 'alertdialog' : 'dialog') + '" aria-modal="true" aria-labelledby="pt-dlg-t"><h2 class="ml-dialog-title" id="pt-dlg-t">' + o.title + '</h2><div class="ml-dialog-body">' + o.body + '</div><div class="ml-dialog-actions"><button type="button" class="ml-btn ml-btn-secondary" data-keep>' + (o.keep || 'Keep') + '</button><button type="button" class="ml-btn ' + (o.tone === 'danger' ? 'ml-btn-danger-fill' : 'ml-btn-primary') + '" data-confirm>' + (o.confirm || 'Confirm') + '</button></div></div>';
    document.body.appendChild(scrim);
    function close() { scrim.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    scrim.querySelector('[data-keep]').addEventListener('click', close);
    // onConfirm runs before the dialog is removed and is handed the dialog, so a form inside it
    // can still be read. Closing first left every field detached and unreadable.
    scrim.querySelector('[data-confirm]').addEventListener('click', function () {
      if (o.onConfirm) { o.onConfirm(scrim); close(); return; }
      close();
      if (o.toast) PT.toast(o.toast, { tone: o.toastTone });
    });
    scrim.querySelector('[data-confirm]').focus();
    return scrim;
  };

  /* ---------- prototype bar (screen switcher + open questions) ---------- */
  function bar() {
    var b = document.body, role = b.getAttribute('data-role') || 'guest';
    var file = location.pathname.split('/').pop(), dir = location.pathname.split('/').slice(-2, -1)[0];
    var list = PT.SCREENS[dir] || [], cur = list.find(function (s) { return s[0] === file; }) || [file, document.title, ''];
    var todos = Array.prototype.slice.call(document.querySelectorAll('[data-todo]')).map(function (t) { return t.textContent.trim(); });
    var el = document.createElement('div'); el.className = 'pt-bar';
    el.innerHTML = '<span>Prototype · <b class="pt-bar-role">' + role + '</b></span><span class="pt-bar-title">' + esc(cur[1]) + '</span><span class="pt-bar-fr">' + esc(cur[2]) + '</span><button type="button" data-open-sheet="screens">Screens</button><button type="button" data-open-sheet="todos" data-count="' + todos.length + '">Open questions</button>';
    document.body.appendChild(el);
    var sheet = document.createElement('div'); sheet.className = 'pt-sheet'; document.body.appendChild(sheet);
    function screens() {
      var out = '<h2 style="margin-top:0"><a href="../index.html">All screens and open questions</a></h2>';
      ['public', 'customer', 'farmer', 'admin'].forEach(function (r) { out += '<h2>' + r.charAt(0).toUpperCase() + r.slice(1) + '</h2><ul>' + PT.SCREENS[r].map(function (s) { var here = r === dir && s[0] === file; return '<li><a href="../' + r + '/' + s[0] + '"' + (here ? ' aria-current="page"' : '') + '><span>' + esc(s[1]) + '</span><small>' + esc(s[2]) + '</small></a></li>'; }).join('') + '</ul>'; });
      return out;
    }
    function todoList() { return '<h2>Open questions on this screen</h2>' + (todos.length ? '<ul>' + todos.map(function (t) { return '<li class="pt-sheet-todo">' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="pt-small ml-muted">Nothing undefined on this screen.</p>') + '<p class="pt-small ml-muted" style="margin-top:12px">Each TODO marks something the SRS or decisions do not define. The full list is on the index page.</p>'; }
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-open-sheet]'); if (!btn) return;
      var kind = btn.getAttribute('data-open-sheet');
      if (sheet.getAttribute('data-open') === 'true' && sheet.getAttribute('data-kind') === kind) { sheet.setAttribute('data-open', 'false'); return; }
      sheet.innerHTML = kind === 'screens' ? screens() : todoList(); sheet.setAttribute('data-kind', kind); sheet.setAttribute('data-open', 'true');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sheet.setAttribute('data-open', 'false'); });
  }

  /* ---------- Charts ----------
     Inline SVG, no chart library. Colours were chosen with the dataviz validator against the card surface
     #f1e5cb: brand #2f4a2a for the period on screen and twine #8a6a3f for the one before it are the only pair
     in the token set that clears CVD separation (ΔE 13.9), the normal-vision floor (18.4) and 3:1 contrast.
     The comparison series is dashed as well, so identity never rests on colour alone. Every chart carries a
     legend when it has two series and a table of the same numbers underneath. */
  var C_NOW = 'var(--chart-now)', C_WAS = 'var(--chart-was)';
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
  }
  function group(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  PT.group = group;

  /* spec: { type:'line'|'column', labels:[], series:[{name, values, compare?}], format?, height?, caption? } */
  PT.chart = function (el, spec) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    var fmt = spec.format || group;
    var H = spec.height || 240, PL = 60, PR = 18, PT_ = 14, PB = 30;
    var ser = spec.series, n = spec.labels.length;
    var top = niceMax(Math.max.apply(null, ser.reduce(function (a, x) { return a.concat(x.values); }, [0])));
    el.classList.add('pt-chart');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    /* A column needs room to be read. Below this the chart keeps its width and scrolls sideways
       inside the card, the same way a wide table does, rather than shrinking bars to a hairline. */
    var MIN_BAND = 10 + ser.length * 5;

    function draw() {
      var pane = el.querySelector('.pt-chart-svg');
      var avail = Math.max(300, (pane && pane.clientWidth) || el.clientWidth || 600);
      var W = spec.type === 'column' ? Math.max(avail, PL + PR + n * MIN_BAND) : avail;
      var iw = W - PL - PR, ih = H - PT_ - PB;
      var y = function (v) { return PT_ + ih * (1 - v / top); };
      var parts = [];

      // gridlines: hairline, solid, recessive
      for (var t = 0; t <= 4; t++) {
        var gv = (top / 4) * t, gy = y(gv);
        parts.push('<line x1="' + PL + '" y1="' + gy + '" x2="' + (W - PR) + '" y2="' + gy + '" stroke="var(--line)" stroke-width="1"/>');
        parts.push('<text x="' + (PL - 10) + '" y="' + (gy + 4) + '" text-anchor="end" class="pt-chart-tick">' + fmt(gv) + '</text>');
      }

      var band = iw / n, cx = function (i) { return PL + band * (i + 0.5); };
      if (spec.type === 'column') {
        /* Every term is clamped positive: a negative width once produced "--0.65" in the path
           data and SVG dropped the whole bar, so the chart came out empty. */
        var gap = ser.length > 1 ? 2 : 0;
        var gutter = Math.min(10, band * 0.25);
        var per = Math.min(24, Math.max(1, (band - gutter - (ser.length - 1) * gap) / ser.length));
        ser.forEach(function (sr, si) {
          var col = sr.compare ? C_WAS : C_NOW;
          sr.values.forEach(function (v, i) {
            var w = per;
            var x0 = cx(i) - (ser.length * w + (ser.length - 1) * gap) / 2 + si * (w + gap);
            var h = Math.max(0, ih * (v / top)), yy = PT_ + ih - h, r = Math.max(0, Math.min(4, w / 2, h));
            parts.push('<path d="M' + x0 + ' ' + (PT_ + ih) + 'V' + (yy + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r +
              'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (PT_ + ih) + 'Z" fill="' + col + '"' +
              (sr.compare ? ' fill-opacity="0.55"' : '') + '/>');
          });
        });
      } else {
        ser.forEach(function (sr) {
          var col = sr.compare ? C_WAS : C_NOW;
          var pts = sr.values.map(function (v, i) { return cx(i) + ' ' + y(v); }).join(' L');
          if (!sr.compare) parts.push('<path d="M' + PL + ' ' + (PT_ + ih) + 'L' + pts + 'L' + (W - PR) + ' ' + (PT_ + ih) + 'Z" fill="' + col + '" fill-opacity="0.1"/>');
          parts.push('<path d="M' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (sr.compare ? ' stroke-dasharray="6 5"' : '') + '/>');
          if (!sr.compare) {
            var li = sr.values.length - 1;
            parts.push('<circle cx="' + cx(li) + '" cy="' + y(sr.values[li]) + '" r="5" fill="' + col + '" stroke="var(--surface-raised)" stroke-width="2"/>');
          }
        });
      }

      // x labels, thinned so they never collide
      var step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 68))));
      var lastDrawn = -99;
      spec.labels.forEach(function (lb, i) {
        var wanted = i % step === 0 || i === n - 1;
        // the final label is dropped rather than allowed to collide with the one before it
        if (!wanted || (i - lastDrawn) * band < 56) return;
        lastDrawn = i;
        parts.push('<text x="' + cx(i) + '" y="' + (H - 9) + '" text-anchor="middle" class="pt-chart-tick">' + esc(lb) + '</text>');
      });
      // one transparent hit band per point
      for (var i2 = 0; i2 < n; i2++) parts.push('<rect x="' + (PL + band * i2) + '" y="' + PT_ + '" width="' + band + '" height="' + ih + '" fill="transparent" data-i="' + i2 + '"/>');

      // wider than the card means it scrolls at its own size; otherwise it fills the card
      pane.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + (W > avail ? W + 'px' : '100%') + '" height="' + H + '" role="img" aria-label="' + esc(spec.caption || 'Chart') + '">' + parts.join('') + '</svg>';
    }

    var legend = ser.length > 1 ? '<div class="pt-chart-legend">' + ser.map(function (sr) {
      return '<span class="pt-chart-key"><span class="pt-chart-swatch' + (sr.compare ? ' pt-chart-swatch-was' : '') + '" aria-hidden="true"></span>' + esc(sr.name) + '</span>';
    }).join('') + '</div>' : '';
    var table = '<details class="pt-chart-table"><summary>Show the numbers</summary>' + PT.table(null,
      [{ key: 'l', label: spec.axisLabel || 'Period' }].concat(ser.map(function (sr, i) { return { key: 's' + i, label: sr.name, align: 'num' }; })),
      spec.labels.map(function (lb, i) { var r = { l: lb }; ser.forEach(function (sr, si) { r['s' + si] = fmt(sr.values[i]); }); return r; })) + '</details>';

    el.innerHTML = legend + '<div class="pt-chart-svg"></div><div class="pt-chart-tip" hidden></div>' + table;
    draw();
    if (window.ResizeObserver) { var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(draw, 80); }).observe(el); }

    var tip = el.querySelector('.pt-chart-tip');
    el.addEventListener('mousemove', function (e) {
      var hit = e.target.closest('rect[data-i]');
      if (!hit) { tip.hidden = true; return; }
      var i = +hit.getAttribute('data-i'), box = el.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(spec.labels[i]) + '</b>' + ser.map(function (sr) {
        return '<span><span class="pt-chart-swatch' + (sr.compare ? ' pt-chart-swatch-was' : '') + '" aria-hidden="true"></span>' + esc(sr.name) + ' <b>' + fmt(sr.values[i]) + '</b></span>';
      }).join('');
      tip.hidden = false;
      tip.style.left = Math.min(Math.max(e.clientX - box.left, 70), box.width - 70) + 'px';
    });
    el.addEventListener('mouseleave', function () { tip.hidden = true; });
  };

  /* Stock before a market day. The number that matters is what is still sellable, so it leads;
     the meter fills with what is already reserved, which makes "nearly gone" visible without reading. */
  PT.stockList = function (rows) {
    return '<ul class="pt-stock">' + rows.map(function (r) {
      var reserved = r.total - r.left;
      var pct = Math.round((reserved / r.total) * 100);
      var level = r.left === 0 ? 'full' : r.left / r.total <= 0.25 ? 'warn' : 'ok';
      return '<li class="pt-stock-row" data-level="' + level + '">' +
        '<div class="pt-stock-head"><b>' + esc(r.name) + '</b><span class="pt-stock-left">' + r.left + '<span> left</span></span></div>' +
        '<div class="pt-meter-track"><span class="pt-meter-fill" data-level="' + level + '" style="width:' + pct + '%"></span></div>' +
        '<span class="pt-stock-say">' + reserved + ' of ' + r.total + ' reserved' + (level === 'warn' ? ' · running low' : level === 'full' ? ' · sold out' : '') + '</span></li>';
    }).join('') + '</ul>';
  };

  /* horizontal bars: one measure across categories, so one colour for every bar */
  PT.barList = function (rows, o) {
    o = o || {};
    var fmt = o.format || group;
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    return '<ul class="pt-bars">' + rows.map(function (r) {
      var suffix = r.suffix !== undefined ? r.suffix : o.suffix;
      return '<li><span>' + (r.html || esc(r.label)) + '</span><span class="bar"><span style="width:' + Math.round((r.value / max) * 100) + '%"></span></span><span class="val">' + fmt(r.value) + (suffix ? ' <span class="pt-bars-unit">' + esc(suffix) + '</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  };

  PT.sparkline = function (values) {
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values), W = 84, H = 26;
    var rng = max - min || 1;
    var pts = values.map(function (v, i) { return (i / (values.length - 1)) * (W - 6) + 3 + ' ' + (H - 3 - ((v - min) / rng) * (H - 8)); }).join(' L');
    var last = pts.split(' L').pop().split(' ');
    return '<svg class="pt-spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><path d="M' + pts + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="currentColor"/></svg>';
  };

  /* stat tile with a comparison, now that there is a comparison period to measure against */
  PT.kpi = function (o) {
    var d = o.delta, deltaHTML = '';
    if (d) {
      var vs = '<span class="ml-muted"> ' + esc(d.vs || 'vs the period before') + '</span>';
      if (!d.pct) {
        deltaHTML = '<span class="pt-kpi-delta pt-kpi-flat">no change' + vs + '</span>';
      } else {
        var up = d.pct > 0, good = d.good !== undefined ? d.good : up;
        deltaHTML = '<span class="pt-kpi-delta' + (good ? '' : ' pt-kpi-bad') + '">' + (up ? I.trendUp() : I.trendDown()) +
          (up ? '+' : '') + d.pct + (d.unit || '%') + vs + '</span>';
      }
    }
    // With a href the whole tile is the control, so there is no separate link to hunt for.
    // The screen-reader name stays the numbers, with the destination appended.
    var tag = o.href ? 'a' : 'div';
    var attrs = o.href ? ' class="ml-card ml-stat pt-kpi-btn' + (o.highlight ? ' ml-stat-hl' : '') + '" href="' + o.href + '"'
                       : ' class="ml-card ml-stat' + (o.highlight ? ' ml-stat-hl' : '') + '"';
    return '<' + tag + attrs + '>' +
      '<span class="ml-stat-label ml-overline">' + esc(o.label) + '</span>' +
      '<span class="ml-stat-value">' + o.value + '</span>' +
      deltaHTML + (o.note ? '<span class="ml-stat-note">' + o.note + '</span>' : '') +
      (o.spark ? '<span class="pt-kpi-spark">' + PT.sparkline(o.spark) + '</span>' : '') +
      (o.href ? '<span class="ml-sr">. ' + esc(o.linkLabel || 'Open') + '</span>' : '') +
      '</' + tag + '>';
  };

  /* period picker: granularity, the two dates, and what it is being compared with */
  PT.periodBar = function (o) {
    o = o || {};
    var g = o.granularity || 'month';
    var tabs = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year'], ['custom', 'Custom']];
    return '<div class="ml-card pt-period">' +
      '<div class="pt-period-tabs" role="tablist" aria-label="Period length">' + tabs.map(function (t) {
        return '<button type="button" role="tab" aria-selected="' + (t[0] === g) + '" data-period="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="pt-period-range">' +
        '<div class="ml-field"><label class="ml-field-label" for="pt-from">From</label><input id="pt-from" class="ml-input" type="date" value="' + (o.from || '2026-09-01') + '"></div>' +
        '<div class="ml-field"><label class="ml-field-label" for="pt-to">To</label><input id="pt-to" class="ml-input" type="date" value="' + (o.to || '2026-09-30') + '"></div>' +
        '<div class="ml-field"><label class="ml-field-label" for="pt-cmp">Compare with</label><select id="pt-cmp" class="ml-input"><option>The period before, same length</option><option>The same period last year</option><option>No comparison</option></select></div>' +
      '</div>' +
      '<p class="pt-period-say"><b>' + esc(o.label || 'September 2026') + '</b> · ' + esc(o.days || '30 days') +
        '<span class="ml-muted"> compared with <b>' + esc(o.compare || 'August 2026') + '</b>, the same length</span></p>' +
    '</div>';
  };

  /* ---------- Settings, shared by all three roles ---------- */
  function setRow(title, note, control, wide) {
    return '<li' + (wide ? ' class="pt-set-wide"' : '') + '><div><b>' + title + '</b>' + (note ? '<p>' + note + '</p>' : '') + '</div>' + (control || '') + '</li>';
  }
  function sel(id, label, opts, value) {
    return '<div class="ml-field"><label class="ml-sr" for="' + id + '">' + esc(label) + '</label><select id="' + id + '" class="ml-input">' +
      opts.map(function (o) { return '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
  }
  PT.themePicker = function () {
    var cur = PT.theme.get();
    var chips = [
      ['light', 'Light', '#dcc59d', '#2f4a2a'],
      ['dark', 'Dark', '#181410', '#8dbb7b'],
      ['system', 'Match device', '#dcc59d', '#181410'],
    ];
    return '<div class="pt-themes">' + chips.map(function (c) {
      return '<button type="button" class="pt-theme" data-theme-pick="' + c[0] + '" aria-pressed="' + (c[0] === cur) + '">' +
        '<span class="pt-theme-chip" aria-hidden="true"><i style="background:' + c[2] + '"></i><i style="background:' + c[3] + '"></i></span>' +
        '<span>' + c[1] + '</span></button>';
    }).join('') + '</div>';
  };

  PT.settings = function (role) {
    var common = '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Appearance</h2><ul class="pt-set">' +
      setRow('Theme', 'Dark is a proposal, not part of the design system yet. Every colour was re-derived and measured, not flipped.', PT.themePicker()) +
      setRow('Language', 'The interface is written in English. A Vietnamese translation is a separate piece of work.',
        sel('s-lang', 'Language', ['English', 'Tiếng Việt (not translated yet)'], 'English')) +
      '</ul></section>' +

      '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Money, dates and units</h2><ul class="pt-set">' +
      setRow('Show prices in', 'You always hand over Vietnamese đồng at the stall. Another currency here is a conversion for reading only.',
        sel('s-cur', 'Currency', ['₫ Vietnamese đồng', '$ US dollar', '€ Euro', '¥ Japanese yen'], '₫ Vietnamese đồng')) +
      setRow('Weights and volumes', 'Only converts units that measure something. A stall that sells by the bunch, the bulb or the tray keeps its own word either way.',
        sel('s-unit', 'Units', ['Metric · kg, g, litre', 'Imperial · lb, oz, pint'], 'Metric · kg, g, litre')) +
      setRow('Date', null, sel('s-date', 'Date format', ['31/12/2026', '12/31/2026', '2026-12-31'], '31/12/2026')) +
      setRow('Clock', null, sel('s-time', 'Clock', ['24-hour · 19:00', '12-hour · 7:00 pm'], '24-hour · 19:00')) +
      '</ul></section>';

    var notes = {
      customer: [['An order is accepted or declined', true], ['An order is ready to collect', true], ['A saved product is back in stock', true], ['Announcements from MarketLink', true], ['A stall replies to your message', false]],
      farmer: [['A new order arrives', true], ['A customer edits or cancels an order', true], ['A cutoff is an hour away', true], ['A new review of your stall', false], ['Announcements from MarketLink', true]],
      admin: [['A Farmer application arrives', true], ['A review or listing is reported', true], ['New feedback', false], ['A market is edited', false]],
    }[role] || [];
    var notif = '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Notifications</h2>' +
      '<p class="pt-small ml-muted">In-app only for now. Email is a later addition.</p><div class="pt-col-2">' +
      notes.map(function (n) { return PT.checkbox(esc(n[0]), { checked: n[1] }); }).join('') + '</div></section>';

    var extra = '';
    if (role === 'farmer') {
      extra = '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Selling defaults</h2><ul class="pt-set">' +
        setRow('Order cutoff', 'How many hours before a pickup slot the order locks.', sel('s-cut', 'Cutoff hours', ['6 hours', '12 hours', '18 hours', '24 hours'], '12 hours')) +
        setRow('Slot length', 'Used when you generate pickup slots for a new week.', sel('s-slot', 'Slot length', ['15 minutes', '30 minutes', '60 minutes'], '30 minutes')) +
        setRow('Orders per slot', null, sel('s-max', 'Orders per slot', ['3', '5', '8', '10'], '5')) +
        '</ul></section>';
    }
    if (role === 'customer') {
      extra = '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Shopping</h2><ul class="pt-set">' +
        setRow('Market you shop at most', 'Sorted first in lists and on the map.', sel('s-mk', 'Market', PT.markets.map(function (m) { return m.name; }), 'Thảo Điền Weekend Market')) +
        setRow('Pickup time you prefer', 'Pre-selected when a stall has that slot free.', sel('s-slotpref', 'Preferred slot', ['Earliest free', '06:00 – 07:00', '07:00 – 08:00', '08:00 – 09:00'], 'Earliest free')) +
        '</ul></section>';
    }
    if (role === 'admin') {
      extra = '<section class="ml-card pt-panel pt-col-3"><h2 class="pt-h3">Platform defaults</h2>' +
        '<p class="pt-small ml-muted">Applied to a stall that has not set its own. Money and allowances live on <a href="../admin/pricing.html">Pricing</a>.</p><ul class="pt-set">' +
        setRow('Default cutoff', null, sel('s-dcut', 'Default cutoff', ['6 hours', '12 hours', '24 hours'], '12 hours')) +
        setRow('Default orders per slot', null, sel('s-dmax', 'Default orders per slot', ['3', '5', '8'], '5')) +
        setRow('Timezone', 'Every date and time on the platform is read in this zone.', sel('s-tz', 'Timezone', ['Asia/Ho_Chi_Minh'], 'Asia/Ho_Chi_Minh')) +
        '</ul></section>';
    }
    return common + notif + extra +
      '<div class="pt-form-actions"><button type="button" class="ml-btn ml-btn-primary" data-toast="Settings saved.">Save settings</button><span class="pt-small ml-muted">The theme applies as soon as you pick it.</span></div>';
  };

  /* ---------- Dashboard shell (Farmer and Admin) ----------
     The design system defines one horizontal SiteHeader on `board`. Work screens get a board-green sidebar
     instead, with grouped navigation and the stall or platform context at the top, and a quiet work-area
     header carrying the page name, search and the signed-in person. Deviation for FE1 and LEAD to confirm. */
  var SIDE = {
    farmer: {
      badge: 'Farmer', home: 'farmer/overview.html',
      groups: [
        ['Today', [
          ['overview.html', 'Overview', 'dashboard'],
          ['orders.html', 'Incoming orders', 'ready', 4, ['order.html']],
          ['slots.html', 'Pickup slots', 'clock'],
        ]],
        ['Stock', [
          ['stock-week.html', "This week's stock", 'box'],
          ['products.html', 'Products', 'tag', 0, ['product-form.html']],
        ]],
        ['Stall', [
          ['stall-profile.html', 'Stall & pickup', 'store'],
          ['reviews.html', 'Reviews', 'star'],
          ['history.html', 'Sales history', 'chart'],
        ]],
        ['Inbox', [
          ['messages.html', 'Messages', 'chat', 1],
          ['notifications.html', 'Notifications', 'bell', 2],
        ]],
        ['Account', [
          /* A Farmer is a Customer with a stall, so the person lives on the Customer account page.
             Without this the panel only ever reached the stall, and a Farmer could not change
             their own password or details. */
          ['../customer/account.html?as=farmer', 'Your account', 'users'],
          ['promote.html', 'Promote & listings', 'tag'],
          ['pending.html', 'Approval status', 'shield'],
          ['settings.html', 'Settings', 'sliders'],
        ]],
        ['Shop', [
          ['../public/markets.html', 'Shop at the markets', 'cart'],
        ]],
      ],
    },
    admin: {
      badge: 'Admin', home: 'admin/overview.html',
      groups: [
        ['Analytics', [
          ['overview.html', 'Overview', 'dashboard'],
          ['reports.html', 'Reports', 'chart'],
          ['revenue.html', 'Platform revenue', 'tag'],
          ['orders.html', 'Orders', 'ready', 0, ['order.html']],
        ]],
        ['People', [
          ['farmers.html', 'Farmers', 'users', 2, ['farmer.html']],
          ['customers.html', 'Customers', 'users', 0, ['customer.html']],
        ]],
        ['Marketplace', [
          ['markets.html', 'Markets', 'store', 0, ['market-form.html']],
          ['moderation.html', 'Moderation', 'shield', 1],
        ]],
        ['Platform', [
          ['categories.html', 'Categories & units', 'tag'],
          ['announcements.html', 'Announcements', 'megaphone'],
          ['feedback.html', 'Feedback inbox', 'chat', 2],
          ['pricing.html', 'Pricing & allowances', 'tag'],
          ['settings.html', 'Settings', 'sliders'],
          ['account.html', 'Your profile', 'users'],
        ]],
      ],
    },
  };

  function sidebarHTML(role, file) {
    var cfg = SIDE[role], u = PT.users[role] || {};
    var ctx = role === 'farmer'
      ? { mono: 'C', name: 'Cô Tư Garden', sub: 'Approved · 2 markets' }
      : { mono: 'M', name: 'MarketLink', sub: 'Platform · 4 markets' };
    var nav = cfg.groups.map(function (g) {
      return '<div class="pt-side-group"><h2>' + g[0] + '</h2>' + g[1].map(function (it) {
        var here = it[0] === file || (it[4] || []).indexOf(file) >= 0;
        var href = it[0].indexOf('../') === 0 ? '../' + it[0].slice(3) : '../' + role + '/' + it[0];
        return '<a class="pt-side-link" href="' + href + '" title="' + esc(it[1]) + '"' + (here ? ' aria-current="page"' : '') + '>' + I[it[2]]() + '<span>' + esc(it[1]) + '</span>' + (it[3] ? '<span class="pt-side-count">' + it[3] + '</span>' : '') + '</a>';
      }).join('') + '</div>';
    }).join('');
    var who = role === 'farmer' ? { mail: 'cotu@example.com', line: 'Farmer · Cô Tư Garden', mono: 'CT' } : { mail: 'admin@marketlink.local', line: 'Admin · whole platform', mono: 'AD' };
    return '<aside class="pt-side" aria-label="' + cfg.badge + ' navigation">' +
      '<div class="pt-side-top">' + PT.logo(26, '../' + cfg.home) + '<span class="pt-side-badge">' + cfg.badge + '</span>' +
        '<button type="button" class="pt-side-fold" data-side-fold aria-label="Collapse the sidebar" title="Collapse the sidebar">' + I.fold() + '</button></div>' +
      '<div class="pt-side-ctx"><span class="pt-side-ctx-mono" aria-hidden="true">' + ctx.mono + '</span><span><b>' + esc(ctx.name) + '</b><span>' + esc(ctx.sub) + '</span></span>' +
        '<button type="button" data-scope aria-label="Change which market you are looking at">' + I.swap() + '</button></div>' +
      '<nav class="pt-side-nav" aria-label="Sections">' + nav + '</nav>' +
      '<div class="pt-side-user"><span class="pt-side-user-mono" aria-hidden="true">' + who.mono + '</span><span><b>' + who.mail + '</b><span>' + esc(who.line) + '</span></span>' +
        '<a class="pt-side-out" href="../public/login.html">' + I.out() + 'Sign out</a></div></aside>';
  }

  function appHeadHTML(role, o) {
    var bell = role === 'farmer'
      ? '<a class="pt-appbtn" href="../farmer/notifications.html" aria-label="Notifications, 2 unread">' + I.bell() + '<span class="ml-hbadge" aria-hidden="true">2</span></a>' : '';
    var acct = role === 'farmer' ? '../customer/account.html?as=farmer' : '../admin/account.html';
    var mono = role === 'farmer' ? 'CT' : 'AD';
    // A back arrow on a page you reached from the sidebar has nothing to go back to, so it only
    // appears on the screens that are opened from a list.
    var file = location.pathname.split('/').pop();
    var top = {};
    SIDE[role].groups.forEach(function (g) { g[1].forEach(function (it) { top[it[0]] = 1; }); });
    var back = top[file] ? '' : '<button type="button" class="pt-apphead-back" data-back aria-label="Go back">' + I.chevronLeft() + '</button>';
    return '<header class="pt-apphead">' +
      '<button type="button" class="pt-appbtn pt-appmenu" data-side-open aria-label="Open navigation">' + I.menu() + '</button>' + back +
      '<div class="pt-apphead-title"><b></b><div class="pt-apphead-sub"></div></div>' +
      '<div class="pt-apphead-tools">' +
        '<div class="pt-appsearch">' + I.search() + '<label class="ml-sr" for="pt-appq">Search</label><input id="pt-appq" type="search" placeholder="' + (role === 'farmer' ? 'Order code or customer' : 'Stall, customer or market') + '"><kbd>⌘K</kbd></div>' +
        bell + '<a class="pt-appavatar" href="' + acct + '" aria-label="Your account">' + mono + '</a>' +
      '</div></header>';
  }

  function mountShell(role, o) {
    var main = document.querySelector('main');
    if (!main) return;
    var file = location.pathname.split('/').pop();
    var shell = document.createElement('div');
    shell.className = 'pt-shell';
    shell.innerHTML = sidebarHTML(role, file) + '<div class="pt-app">' + appHeadHTML(role, o) + '</div>';
    main.parentNode.insertBefore(shell, main);
    var app = shell.querySelector('.pt-app');
    app.appendChild(main);
    app.insertAdjacentHTML('beforeend', '<div class="pt-appfoot"><span>© 2026 MarketLink · TechWiz 7</span><span>Map data © OpenStreetMap contributors</span></div>');
    document.body.setAttribute('data-shell', 'true');
    try { if (localStorage.getItem('pt-side') === 'folded') shell.setAttribute('data-folded', 'true'); } catch (e) { /* private window */ }
    var fold = shell.querySelector('[data-side-fold]');
    fold.addEventListener('click', function () {
      var on = shell.getAttribute('data-folded') !== 'true';
      shell.setAttribute('data-folded', on);
      fold.setAttribute('aria-label', on ? 'Expand the sidebar' : 'Collapse the sidebar');
      fold.setAttribute('title', fold.getAttribute('aria-label'));
      try { localStorage.setItem('pt-side', on ? 'folded' : 'open'); } catch (e) { /* private window */ }
    });
    if (shell.getAttribute('data-folded') === 'true') { fold.setAttribute('aria-label', 'Expand the sidebar'); fold.setAttribute('title', 'Expand the sidebar'); }

    // the page name moves out of the page and into the header, keeping any live element in the kicker
    var h1 = main.querySelector('h1');
    var bEl = shell.querySelector('.pt-apphead-title b'), subEl = shell.querySelector('.pt-apphead-sub');
    if (h1) {
      bEl.textContent = o.title || h1.textContent.trim();
      var prev = h1.previousElementSibling;
      if (prev && /ml-overline|ml-hand/.test(prev.className || '')) { prev.className = ''; subEl.appendChild(prev); }
      else if (o.subtitle) subEl.textContent = o.subtitle;
      h1.remove();
    } else {
      bEl.textContent = o.title || document.title.split(' — ')[0];
      if (o.subtitle) subEl.textContent = o.subtitle;
    }

    var backBtn = shell.querySelector('[data-back]');
    if (backBtn) backBtn.addEventListener('click', function () { history.length > 1 ? history.back() : (location.href = '../' + SIDE[role].home); });
    shell.querySelector('[data-side-open]').addEventListener('click', function () { shell.setAttribute('data-side', 'open'); });
    shell.addEventListener('click', function (e) {
      if (shell.getAttribute('data-side') === 'open' && !e.target.closest('.pt-side') && !e.target.closest('[data-side-open]')) shell.setAttribute('data-side', 'closed');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shell.setAttribute('data-side', 'closed'); });
    shell.querySelector('[data-scope]').addEventListener('click', function () {
      var opts = role === 'farmer'
        ? '<option>All markets</option><option>Thảo Điền Weekend Market</option><option>Thủ Đức Farmers Market</option>'
        : '<option>All markets</option>' + PT.markets.map(function (m) { return '<option>' + esc(m.name) + '</option>'; }).join('');
      PT.dialog({ title: 'Which market are you looking at?', body: '<p>Orders, stock and totals on every screen follow this choice.</p><div class="ml-field" style="min-width:0"><label class="ml-field-label" for="scope">Market</label><select id="scope" class="ml-input">' + opts + '</select></div>', keep: 'Cancel', confirm: 'Apply', toast: 'Scope changed. Every screen now shows that market only.' });
    });
  }

  /* ---------- Carousel: full-bleed photo band with a paper tag panel (home page) ----------
     slides: [{ topic, title, text, cta:[label, href], photo, alt, note }] */
  PT.carouselHTML = function (slides, label) {
    return '<section class="pt-car" data-carousel aria-roledescription="carousel" aria-label="' + esc(label) + '">' +
      '<div class="pt-car-view">' + slides.map(function (s, i) {
        return '<article class="pt-car-slide" data-slide data-active="' + (i === 0) + '"' + (i === 0 ? '' : ' inert') + ' role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + slides.length + ': ' + esc(s.topic) + '">' +
          '<img class="pt-car-img" src="' + s.photo + '" alt="' + esc(s.alt) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" decoding="async">' +
          (s.note ? '<span class="pt-car-note ml-label">' + esc(s.note) + '</span>' : '') +
          '<div class="pt-car-inner"><div class="ml-card pt-car-panel">' +
            '<p class="ml-overline ml-muted">' + esc(s.topic) + '</p>' +
            '<h3 class="pt-car-title">' + esc(s.title) + '</h3>' +
            '<p class="pt-car-text">' + esc(s.text) + '</p>' +
            (s.cta ? '<a class="ml-btn ml-btn-secondary pt-car-cta" href="' + s.cta[1] + '">' + esc(s.cta[0]) + '</a>' : '') +
          '</div></div></article>';
      }).join('') + '</div>' +
      '<button type="button" class="pt-car-nav pt-car-prev" data-car-prev aria-label="Previous slide">' + I.chevronLeft() + '</button>' +
      '<button type="button" class="pt-car-nav pt-car-next" data-car-next aria-label="Next slide">' + I.chevronRight() + '</button>' +
      '<div class="pt-car-foot"><div class="pt-car-dots">' +
        slides.map(function (s, i) { return '<button type="button" class="pt-car-dot" data-dot aria-current="' + (i === 0 ? 'true' : 'false') + '" aria-label="Show slide ' + (i + 1) + ': ' + esc(s.topic) + '"><i></i></button>'; }).join('') +
        '<button type="button" class="pt-car-dot pt-car-pause" data-car-pause aria-label="Pause the slideshow">' + I.pause() + '</button>' +
      '</div></div>' +
      '<p class="ml-sr" data-car-live aria-live="polite"></p></section>';
  };

  PT.carousel = function (root) {
    if (typeof root === 'string') root = document.querySelector(root);
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('[data-slide]'));
    var dots = [].slice.call(root.querySelectorAll('[data-dot]:not([data-car-pause])'));
    var live = root.querySelector('[data-car-live]');
    var pauseBtn = root.querySelector('[data-car-pause]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var at = 0, timer = null, wanted = !reduce.matches, held = false;
    function show(n) {
      at = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { var on = k === at; s.setAttribute('data-active', on); s.toggleAttribute('inert', !on); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === at ? 'true' : 'false'); });
      if (live) live.textContent = slides[at].getAttribute('aria-label');
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function run() { stop(); if (wanted && !held) timer = setInterval(function () { show(at + 1); }, 5000); }
    function setWanted(v) {
      wanted = v;
      pauseBtn.innerHTML = v ? I.pause() : I.play();
      pauseBtn.setAttribute('aria-label', v ? 'Pause the slideshow' : 'Play the slideshow');
      run();
    }
    root.querySelector('[data-car-prev]').addEventListener('click', function () { show(at - 1); run(); });
    root.querySelector('[data-car-next]').addEventListener('click', function () { show(at + 1); run(); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); run(); }); });
    pauseBtn.addEventListener('click', function () { setWanted(!wanted); });
    // the slideshow holds while someone is reading or tabbing through it (WCAG 2.2.2)
    ['mouseenter', 'focusin'].forEach(function (e) { root.addEventListener(e, function () { held = true; stop(); }); });
    ['mouseleave', 'focusout'].forEach(function (e) { root.addEventListener(e, function () { held = false; run(); }); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : run(); });
    reduce.addEventListener('change', function (e) { setWanted(!e.matches); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(at - 1); run(); }
      else if (e.key === 'ArrowRight') { show(at + 1); run(); }
      else return;
      e.preventDefault();
    });
    setWanted(wanted);
    show(0);
  };

  /* ---------- Theme: light, dark, or whatever the device asks for ---------- */
  PT.theme = {
    get: function () { try { return localStorage.getItem('pt-theme') || 'system'; } catch (e) { return 'system'; } },
    set: function (v) {
      try { localStorage.setItem('pt-theme', v); } catch (e) { /* private window */ }
      PT.theme.apply();
    },
    apply: function () {
      var v = PT.theme.get();
      var dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.querySelectorAll('[data-theme-pick]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-pick') === v); });
    },
  };

  /* ---------- live clock: <time data-clock> shows the real date and time, e.g. "Thu 24/09 · 14:35" ---------- */
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  PT.nowLabel = function (withYear) { var d = new Date(); return DOW[d.getDay()] + ' ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + (withYear ? '/' + d.getFullYear() : '') + ' · ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  PT.clock = function () {
    function tick() { document.querySelectorAll('[data-clock]').forEach(function (el) { el.textContent = PT.nowLabel(el.getAttribute('data-clock') === 'year'); el.setAttribute('datetime', new Date().toISOString()); }); }
    tick(); setInterval(tick, 15000);
  };

  /* ---------- behaviours wired by data attributes ---------- */
  function wire() {
    document.body.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-toast]'))) { PT.toast(t.getAttribute('data-toast'), { action: t.getAttribute('data-toast-action'), tone: t.getAttribute('data-toast-tone') }); }
      if ((t = e.target.closest('[data-dismiss]'))) { var bn = t.closest('.ml-banner'); if (bn) bn.remove(); }
      if ((t = e.target.closest('[data-fav]'))) { var on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', on); t.innerHTML = I.heart(on); var kind = t.getAttribute('data-fav-kind'); PT.toast((on ? (kind === 'market' ? 'Saved ' : 'Added ') : (kind === 'market' ? 'Removed ' : 'Removed ')) + t.getAttribute('data-name') + (on ? (kind === 'market' ? ' as a preferred market.' : ' to your favorites. You will hear when it is back in stock.') : (kind === 'market' ? ' from preferred markets.' : ' from your favorites.'))); }
      if ((t = e.target.closest('[data-chip]'))) { var grp = t.getAttribute('data-chip-group'); if (grp) document.querySelectorAll('[data-chip-group="' + grp + '"]').forEach(function (c) { if (c !== t) { c.setAttribute('aria-pressed', 'false'); var s = c.querySelector('svg'); if (s) s.remove(); } }); var pressed = t.getAttribute('aria-pressed') !== 'true'; if (grp && !pressed) return; t.setAttribute('aria-pressed', pressed); var ic = t.querySelector('svg'); if (pressed && !ic) t.insertAdjacentHTML('afterbegin', I.check()); if (!pressed && ic) ic.remove(); }
      if ((t = e.target.closest('[data-tab]'))) { var tabs = t.closest('[data-tabs]'); tabs.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b === t); b.tabIndex = b === t ? 0 : -1; }); var id = t.getAttribute('data-tab'); document.querySelectorAll('[data-panel]').forEach(function (p) { if (p.closest('[data-tabs-scope]') && p.closest('[data-tabs-scope]') !== tabs.closest('[data-tabs-scope]')) return; p.hidden = p.getAttribute('data-panel') !== id; }); }
      if ((t = e.target.closest('[data-inc],[data-dec]'))) { var w = t.closest('[data-qty]'), out = w.querySelector('output'), max = +w.getAttribute('data-max'), min = +w.getAttribute('data-min'), v = +out.textContent + (t.hasAttribute('data-inc') ? 1 : -1); v = Math.max(min, Math.min(max, v)); out.textContent = v; w.querySelector('[data-dec]').disabled = v <= min; w.querySelector('[data-inc]').disabled = v >= max; w.querySelector('.ml-qty-note').textContent = v >= max ? 'Max ' + PT.units(max, w.getAttribute('data-unit')) : PT.units(max, w.getAttribute('data-unit')) + ' left'; var li = t.closest('.ml-cart-item'); if (li) { li.querySelector('.ml-cart-item-sum').textContent = PT.vnd(v * +li.getAttribute('data-price')); recalc(li.closest('[data-cart-group]')); } }
      if ((t = e.target.closest('[data-remove-item]'))) { var li2 = t.closest('.ml-cart-item'), g = li2.closest('[data-cart-group]'); li2.remove(); recalc(g); PT.toast('Removed from your cart.', { action: 'Undo' }); }
      var drawer = document.querySelector('[data-drawer]');
      if (drawer && e.target.closest('[data-drawer-open]')) drawer.setAttribute('data-open', 'true');
      if (drawer && (e.target.closest('[data-drawer-close]') || e.target.matches('[data-drawer]'))) drawer.setAttribute('data-open', 'false');
      if ((t = e.target.closest('[data-read-all]'))) { document.querySelectorAll('.ml-note[data-unread="true"]').forEach(function (n) { n.setAttribute('data-unread', 'false'); var d = n.querySelector('.ml-note-dot'); if (d) d.remove(); }); PT.toast('All notifications marked as read.'); }
      if ((t = e.target.closest('[data-state-demo]'))) { var kind2 = t.getAttribute('data-state-demo'); document.querySelectorAll('[data-state-target]').forEach(function (p) { p.hidden = p.getAttribute('data-state-target') !== kind2; }); document.querySelectorAll('[data-state-demo]').forEach(function (b) { b.setAttribute('aria-pressed', b === t); }); }
      if ((t = e.target.closest('[data-theme-pick]'))) PT.theme.set(t.getAttribute('data-theme-pick'));
      if ((t = e.target.closest('[data-confirm-dialog]'))) { var d2 = JSON.parse(t.getAttribute('data-confirm-dialog')); PT.dialog(d2); }
    });
    document.body.addEventListener('change', function (e) {
      var r = e.target.closest('[data-rate]'); if (r && e.target.type === 'radio') r.querySelector('.ml-rate-hint').textContent = RATE_WORDS[+e.target.value];
      var s = e.target.closest('[data-slots]'); if (s && e.target.type === 'radio') { var pick = e.target.parentNode.querySelector('b').textContent; document.querySelectorAll('[data-slot-out="' + s.id + '"]').forEach(function (o) { o.textContent = pick; }); document.dispatchEvent(new CustomEvent('pt:slot', { detail: { id: s.id, time: pick } })); }
    });
    function recalc(g) { if (!g) return; var sum = 0; g.querySelectorAll('.ml-cart-item').forEach(function (li) { sum += +li.querySelector('output').textContent * +li.getAttribute('data-price'); }); g.querySelector('[data-group-total]').textContent = PT.vnd(sum); document.dispatchEvent(new CustomEvent('pt:cart')); }
    PT.recalc = recalc;
  }

  /* ---------- boot: header, announcement, footer, bar ---------- */
  PT.boot = function (o) {
    o = o || {};
    var params = new URLSearchParams(location.search);
    var role = params.get('as') || o.role || document.body.getAttribute('data-role') || 'guest';
    document.body.setAttribute('data-role', role);
    var u = PT.users[role] || {};
    var shell = /\/(farmer|admin)\/[^/]+$/.test(location.pathname) && !/admin\/login\.html$/.test(location.pathname);
    if (shell) {
      mountShell(role, o);
    } else {
      var hdr = PT.header({ role: role, active: o.active, cartCount: role === 'customer' || role === 'guest' ? (o.cartCount != null ? o.cartCount : role === 'customer' ? 3 : 0) : 0, unread: o.unread != null ? o.unread : role === 'customer' ? 2 : role === 'farmer' ? 2 : 0, userName: o.userName || u.name });
      var top = document.getElementById('pt-top');
      if (top) top.innerHTML = (o.announce !== false && (role === 'guest' || role === 'customer') ? PT.banner('announce', esc(PT.announcements[0].title), esc(PT.announcements[0].text), { close: true }) : '') + hdr;
      var renderFoot = function () { var foot = document.getElementById('pt-foot'); if (foot) foot.innerHTML = PT.footer(); };
      // pages call boot() from a script placed before #pt-foot, so render the footer once the document is parsed
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderFoot); else renderFoot();
    }
    PT.theme.apply();
    PT.clock();
    wire();
    bar();
  };
})(window.PT);
