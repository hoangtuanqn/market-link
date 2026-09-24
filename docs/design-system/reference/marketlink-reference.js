/* MarketLink design system — REFERENCE BUNDLE for docs/design-system/reference/gallery.html only.
   Not part of the app build. Real components live in frontend/src as TSX and use the same ml-* classes. */
/* @ds-bundle: {"format":4,"namespace":"MarketLink","components":[{"name":"Logo"},{"name":"SiteHeader"},{"name":"SiteFooter"},{"name":"Button"},{"name":"Field"},{"name":"Checkbox"},{"name":"SearchBar"},{"name":"Chip"},{"name":"Tabs"},{"name":"DayChips"},{"name":"SlotPicker"},{"name":"QtyStepper"},{"name":"PriceTag"},{"name":"Rating"},{"name":"RatingInput"},{"name":"ProductCard"},{"name":"StallCard"},{"name":"MarketCard"},{"name":"ReviewCard"},{"name":"CartGroup"},{"name":"OrderStatus"},{"name":"OrderTicket"},{"name":"StatTile"},{"name":"DataTable"},{"name":"Pagination"},{"name":"Banner"},{"name":"Toast"},{"name":"Dialog"},{"name":"NotificationList"},{"name":"ChatMessage"},{"name":"MapPin"},{"name":"DataState"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }
  function omit(obj, keys) {
    var o = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) o[k] = obj[k];
    return o;
  }
  // VND: 25000 -> "25,000 ₫" (comma thousands separator)
  function vnd(n) {
    var s = String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return s + " ₫";
  }
  // English plural for sale units: bunch → bunches, loaf → loaves; kg / dozen stay the same
  var UNIT_SAME = { kg: 1, g: 1, dozen: 1 };
  function units(n, unit) {
    if (!unit) return String(n);
    if (n === 1 || UNIT_SAME[unit]) return n + " " + unit;
    if (unit === "loaf") return n + " loaves";
    if (/(ch|sh|s|x)$/.test(unit)) return n + " " + unit + "es";
    if (/[^aeiou]y$/.test(unit)) return n + " " + unit.slice(0, -1) + "ies";
    return n + " " + unit + "s";
  }
  var uid = 0;
  function useId(prefix, given) {
    var r = React.useRef(given || prefix + "-" + ++uid);
    return r.current;
  }

  /* ---------- glyphs: 1.75 stroke, currentColor, 16px box ---------- */
  function Svg(children, cls, size) {
    return h("svg", { viewBox: "0 0 16 16", width: size || 16, height: size || 16, fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", className: cls }, children);
  }
  function P(d, k) { return h("path", { key: k || d, d: d }); }
  var G = {
    placed: function () { return Svg([h("circle", { key: 1, cx: 8, cy: 8, r: 6 }), P("M8 5v3.2l2 1.3")]); },
    accepted: function () { return Svg([P("M3 8.5l3.2 3L13 4.5")]); },
    ready: function () { return Svg([P("M3 5.5h10l-.8 8H3.8z"), P("M5.8 5.5V4.3a2.2 2.2 0 014.4 0v1.2")]); },
    completed: function () { return Svg([P("M1.5 8.5l3 3L10 5"), P("M7.5 11.3l.3.2L14.5 5")]); },
    declined: function () { return Svg([P("M4 4l8 8M12 4l-8 8")]); },
    cancelled: function () { return Svg([h("circle", { key: 1, cx: 8, cy: 8, r: 6 }), P("M3.8 12.2l8.4-8.4")]); },
    lock: function () { return Svg([h("rect", { key: 1, x: 3, y: 7, width: 10, height: 7, rx: 1.5 }), P("M5.5 7V5a2.5 2.5 0 015 0v2")]); },
    clock: function () { return Svg([h("circle", { key: 1, cx: 8, cy: 8, r: 6 }), P("M8 5v3.2l2 1.3")]); },
    check: function () { return Svg([P("M3 8.5l3.2 3L13 4.5")]); },
    close: function () { return Svg([P("M4 4l8 8M12 4l-8 8")]); },
    search: function () { return Svg([h("circle", { key: 1, cx: 7, cy: 7, r: 4.5 }), P("M10.5 10.5L14 14")]); },
    cart: function () { return Svg([P("M1.5 2h2l1.6 8h7.4l1.5-5.5H4.3"), h("circle", { key: 1, cx: 6.5, cy: 13, r: 1 }), h("circle", { key: 2, cx: 11.5, cy: 13, r: 1 })]); },
    bell: function () { return Svg([P("M4 11V7a4 4 0 018 0v4l1.2 1.5H2.8z"), P("M6.5 14h3")]); },
    menu: function () { return Svg([P("M2 4h12M2 8h12M2 12h12")]); },
    info: function () { return Svg([h("circle", { key: 1, cx: 8, cy: 8, r: 6.25 }), P("M8 7.2v4"), P("M8 4.8v.2")], "ml-icon"); },
    alert: function () { return Svg([P("M8 1.8l6.5 11.4h-13z"), P("M8 6.2v3.3"), P("M8 11.4v.1")], "ml-icon"); },
    megaphone: function () { return Svg([P("M2 6.5v3h2.5l5 3v-9l-5 3z"), P("M12 5.5a3.5 3.5 0 010 5")], "ml-icon"); },
    okCircle: function () { return Svg([h("circle", { key: 1, cx: 8, cy: 8, r: 6.25 }), P("M5.2 8.3l2 1.9 3.6-3.9")], "ml-icon"); },
    restock: function () { return Svg([P("M13.5 8a5.5 5.5 0 11-1.6-3.9"), P("M13.5 2.5v2.8h-2.8")]); },
    pin: function () { return Svg([P("M8 14.5s4.5-4 4.5-7.8a4.5 4.5 0 00-9 0C3.5 10.5 8 14.5 8 14.5z"), h("circle", { key: 1, cx: 8, cy: 6.7, r: 1.6 })]); },
    heart: function (filled) { return h("svg", { viewBox: "0 0 16 16", width: 18, height: 18, "aria-hidden": "true", fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" }, h("path", { d: "M8 13.5S2 10 2 5.9A3 3 0 018 4.6a3 3 0 016 1.3C14 10 8 13.5 8 13.5z" })); },
    star: function (fill) { return h("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", fill: fill ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinejoin: "round" }, h("path", { d: "M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" })); }
  };

  var STATUS = { placed: "Placed", accepted: "Accepted", ready: "Ready for pickup", completed: "Completed", declined: "Declined", cancelled: "Cancelled" };

  /* ================= Identity ================= */

  /* Logo: a hang tag with a real punched hole (evenodd) and twine through the hole. Single ink: currentColor. */
  var LOGO_TAG = "M9 8.5h14.5a2 2 0 012 2V26a2.5 2.5 0 01-2.5 2.5H9A2.5 2.5 0 016.5 26V11.5zM18.4 13.2a2.4 2.4 0 10-4.8 0 2.4 2.4 0 104.8 0z";
  var LOGO_TWINE = "M16 13.2C15.2 8.5 12.6 4.6 8 2.6";
  function Logo(p) {
    var s = p.size || 32;
    var mark = h("svg", { viewBox: "0 0 32 32", width: s, height: s, "aria-hidden": "true" },
      h("path", { d: LOGO_TAG, fill: "currentColor", fillRule: "evenodd" }),
      h("path", { d: LOGO_TWINE, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeDasharray: "2.2 2" })
    );
    return h(p.href ? "a" : "span", { className: cx("ml-logo", p.className), href: p.href, "aria-label": p.href ? "MarketLink — home" : undefined },
      mark, p.markOnly ? null : h("span", { className: "ml-logo-word" }, "MarketLink"));
  }

  /* SiteHeader: board band + twine line. Nav depends on role (FR-004/005: Admin is separate). */
  var NAV = {
    guest: [["markets", "Markets"], ["products", "Products"], ["map", "Map"], ["about", "About us"]],
    customer: [["markets", "Markets"], ["products", "Products"], ["map", "Map"], ["orders", "My orders"], ["favorites", "Favorites"]],
    farmer: [["overview", "Overview"], ["incoming", "Incoming orders"], ["this-week", "This week's stock"], ["products", "Products"], ["reviews", "Reviews"]],
    admin: [["overview", "Overview"], ["farmers", "Farmer approvals"], ["customers", "Customers"], ["markets", "Markets"], ["moderation", "Moderation"], ["reports", "Reports"]]
  };
  function SiteHeader(p) {
    var role = p.role || "guest";
    var items = p.items || NAV[role];
    return h("header", { className: cx("ml-header", p.className) },
      h("div", { className: "ml-header-in" },
        h(Logo, { href: "#", size: 30 }),
        h("nav", { "aria-label": "Main" }, h("ul", { className: "ml-nav" }, items.map(function (it) {
          return h("li", { key: it[0] }, h("a", { href: "#" + it[0], "aria-current": p.active === it[0] ? "page" : undefined }, it[1]));
        }))),
        h("div", { className: "ml-header-tools" },
          role !== "admin" && role !== "farmer" ? h("button", { type: "button", className: "ml-hbtn", "aria-label": "Search" }, G.search()) : null,
          role !== "guest" ? h("button", { type: "button", className: "ml-hbtn", "aria-label": "Notifications" + (p.unread ? ", " + p.unread + " unread" : "") }, G.bell(), p.unread ? h("span", { className: "ml-hbadge", "aria-hidden": "true" }, p.unread) : null) : null,
          role === "customer" || role === "guest" ? h("button", { type: "button", className: "ml-hbtn", "aria-label": "Cart" + (p.cartCount ? ", " + p.cartCount + " items" : "") }, G.cart(), p.cartCount ? h("span", { className: "ml-hbadge", "aria-hidden": "true" }, p.cartCount) : null) : null,
          role === "guest"
            ? h(Button, { variant: "accent", size: "sm", href: "#sign-in" }, "Sign in")
            : h("span", { className: "ml-huser" }, role === "admin" ? "Admin" : role === "farmer" ? "Stall" : "Hi,", h("b", null, p.userName)),
          h("button", { type: "button", className: "ml-hbtn ml-hmenu", "aria-label": "Open menu" }, G.menu())
        )
      ),
      h("div", { className: "ml-header-twine", "aria-hidden": "true" })
    );
  }

  /* SiteFooter: sitemap (FR-085) + pay-at-the-stall reminder */
  function SiteFooter(p) {
    var cols = p.columns || [
      ["Shop", ["Markets near you", "In season", "Market map", "Favorite stalls"]],
      ["Sell", ["Register as a Farmer", "Handling pre-orders", "Stall guidelines"]],
      ["MarketLink", ["About us", "Contact us", "Feedback & bug reports", "Sitemap"]]
    ];
    return h("footer", { className: cx("ml-footer", p.className) },
      h("div", { className: "ml-footer-in" },
        h("div", null, h(Logo, { size: 30 }), h("p", null, "Pre-order from your local farmers market, pick up at the stall. Pay the Farmer directly at pickup.")),
        cols.map(function (c) {
          return h("div", { key: c[0] }, h("h2", null, c[0]), h("ul", null, c[1].map(function (l) { return h("li", { key: l }, h("a", { href: "#" }, l)); })));
        }),
        h("div", { className: "ml-footer-base" }, h("span", null, "© 2026 MarketLink · TechWiz 7"), h("span", null, "Map data © OpenStreetMap contributors"))
      )
    );
  }

  /* ================= Controls ================= */

  function Button(p) {
    var variant = p.variant || "primary";
    var rest = omit(p, ["variant", "size", "icon", "className", "children", "as", "block"]);
    var tag = p.as || (p.href ? "a" : "button");
    if (tag === "button" && !rest.type) rest.type = "button";
    rest.className = cx("ml-btn", "ml-btn-" + variant, p.size === "sm" && "ml-btn-sm", p.block && "ml-btn-block", p.className);
    return h(tag, rest, p.icon || null, p.children);
  }

  function Field(p) {
    var id = useId("ml-f", p.id);
    var tag = p.as || "input";
    var rest = omit(p, ["label", "hint", "error", "as", "className", "children", "id"]);
    rest.id = id;
    rest.className = "ml-input";
    var described = [];
    if (p.hint) described.push(id + "-h");
    if (p.error) described.push(id + "-e");
    if (described.length) rest["aria-describedby"] = described.join(" ");
    if (p.error) rest["aria-invalid"] = "true";
    return h("div", { className: cx("ml-field", p.error && "ml-field-error", p.className) },
      h("label", { className: "ml-field-label", htmlFor: id }, p.label, p.required ? h("span", { className: "ml-field-req", "aria-hidden": "true" }, "*") : null),
      h(tag, rest, p.children),
      p.hint ? h("span", { id: id + "-h", className: "ml-field-hint" }, p.hint) : null,
      p.error ? h("span", { id: id + "-e", className: "ml-field-err", role: "alert" }, p.error) : null
    );
  }

  function Checkbox(p) {
    var rest = omit(p, ["label", "hint", "className"]);
    rest.type = "checkbox";
    return h("label", { className: cx("ml-check", p.className) },
      h("input", rest),
      h("span", { className: "ml-check-box", "aria-hidden": "true" }, G.check()),
      h("span", { className: "ml-check-text" }, p.label, p.hint ? h("small", null, p.hint) : null)
    );
  }

  /* SearchBar (FR-023): scope + keyword; results show as list + map */
  function SearchBar(p) {
    var id = useId("ml-s", p.id);
    var scopes = p.scopes || [["all", "Everything"], ["market", "Markets"], ["farmer", "Stalls"], ["product", "Products"]];
    return h("form", { className: cx("ml-search", p.className), role: "search", onSubmit: function (e) { e.preventDefault(); if (p.onSearch) p.onSearch(e.target.q.value, e.target.scope.value); } },
      h("label", { className: "ml-sr", htmlFor: id + "-scope" }, "Search in"),
      h("select", { id: id + "-scope", name: "scope", defaultValue: p.scope || "all" }, scopes.map(function (s) { return h("option", { key: s[0], value: s[0] }, s[1]); })),
      h("label", { className: "ml-sr", htmlFor: id }, "Keyword"),
      h("input", { id: id, name: "q", type: "search", placeholder: p.placeholder || "Water spinach, Vườn Cô Tư, Thảo Điền market…", defaultValue: p.defaultValue }),
      h(Button, { type: "submit", variant: "primary", icon: G.search() }, "Search")
    );
  }

  function Chip(p) {
    return h("button", { type: "button", className: cx("ml-chip", p.className), "aria-pressed": p.selected ? "true" : "false", onClick: p.onClick },
      p.selected ? G.check() : null, p.children, p.count != null ? h("span", { className: "ml-chip-count" }, p.count) : null);
  }

  function Tabs(p) {
    return h("div", { className: cx("ml-tabs", p.className), role: "tablist", "aria-label": p.label },
      (p.tabs || []).map(function (t) {
        var sel = p.value === t.id;
        return h("button", { key: t.id, type: "button", role: "tab", className: "ml-tab", "aria-selected": sel ? "true" : "false", tabIndex: sel ? 0 : -1, onClick: p.onChange ? function () { p.onChange(t.id); } : undefined },
          t.label, t.count != null ? h("span", { className: "ml-tab-count" }, t.count) : null);
      })
    );
  }

  function DayChips(p) {
    var name = p.name || "market-day";
    return h("fieldset", { className: cx("ml-days", p.className) },
      p.legend ? h("legend", null, p.legend) : null,
      (p.days || []).map(function (d) {
        return h("label", { key: d.value, className: "ml-day" },
          h("input", { type: "radio", name: name, value: d.value, disabled: d.disabled, defaultChecked: p.defaultValue === d.value, checked: p.value !== undefined ? p.value === d.value : undefined, onChange: p.onChange ? function () { p.onChange(d.value); } : undefined }),
          h("span", null, d.label, d.sub ? h("small", null, d.sub) : null)
        );
      })
    );
  }

  /* SlotPicker (FR-032, D-06): full slots are locked and say why */
  function SlotPicker(p) {
    var name = p.name || "pickup-slot";
    return h("fieldset", { className: cx("ml-slots", p.className) },
      p.legend ? h("legend", null, p.legend) : null,
      (p.slots || []).map(function (s) {
        var full = s.booked >= s.max;
        return h("label", { key: s.value, className: "ml-slot" },
          h("input", { type: "radio", name: name, value: s.value, disabled: full, defaultChecked: p.defaultValue === s.value, onChange: p.onChange ? function () { p.onChange(s.value); } : undefined }),
          h("span", null, h("b", null, s.time), h("small", null, full ? "Fully booked" : (s.max - s.booked) + " of " + s.max + " left"))
        );
      })
    );
  }

  /* QtyStepper: never exceeds available stock (D-02) */
  function QtyStepper(p) {
    var min = p.min == null ? 1 : p.min, max = p.max == null ? 99 : p.max;
    var st = React.useState(p.defaultValue || min);
    var v = p.value != null ? p.value : st[0];
    function set(n) { n = Math.max(min, Math.min(max, n)); if (p.value == null) st[1](n); if (p.onChange) p.onChange(n); }
    return h("span", { className: cx("ml-qty-wrap", p.className) },
      h("span", { className: "ml-qty", role: "group", "aria-label": "Quantity " + (p.label || "") },
        h("button", { type: "button", "aria-label": "Decrease by 1", disabled: v <= min, onClick: function () { set(v - 1); } }, "−"),
        h("output", { "aria-live": "polite" }, v),
        h("button", { type: "button", "aria-label": "Increase by 1", disabled: v >= max, onClick: function () { set(v + 1); } }, "+")
      ),
      p.showMax !== false ? h("span", { className: "ml-qty-note" }, v >= max ? "Max " + units(max, p.unit) : units(max, p.unit) + " left") : null
    );
  }

  /* ================= Display ================= */

  function PriceTag(p) {
    return h("span", { className: cx("ml-price", p.size === "lg" && "ml-price-lg", p.className) },
      h("span", { className: "ml-price-amt" }, vnd(p.amount)),
      p.unit ? h("span", { className: "ml-price-unit" }, "/ " + p.unit) : null,
      p.was ? h("span", { className: "ml-price-was" }, h("span", { className: "ml-sr" }, "Was "), vnd(p.was)) : null
    );
  }

  function Rating(p) {
    var v = p.value || 0, stars = [];
    for (var i = 1; i <= 5; i++) stars.push(h("span", { key: i }, G.star(v >= i - 0.25)));
    return h("span", { className: cx("ml-rating", p.className) },
      h("span", { className: "ml-rating-stars", "aria-hidden": "true" }, stars),
      h("span", { className: "ml-rating-num", "aria-hidden": "true" }, v.toFixed(1)),
      p.count != null ? h("span", { className: "ml-muted", "aria-hidden": "true" }, "(" + p.count + " reviews)") : null,
      h("span", { className: "ml-sr" }, v + " out of 5 stars" + (p.count != null ? ", " + p.count + " reviews" : ""))
    );
  }

  /* RatingInput (FR-050/051): 5 radios with a word for each level */
  var RATE_WORDS = ["", "Poor", "Fair", "Okay", "Good", "Excellent"];
  function RatingInput(p) {
    var name = useId(p.name || "rate");
    var st = React.useState(p.defaultValue || 0);
    var v = p.value != null ? p.value : st[0];
    var labels = [];
    for (var i = 5; i >= 1; i--) {
      (function (n) {
        labels.push(h("input", { key: "i" + n, type: "radio", id: name + "-" + n, name: name, value: n, checked: v === n, onChange: function () { st[1](n); if (p.onChange) p.onChange(n); } }));
        labels.push(h("label", { key: "l" + n, htmlFor: name + "-" + n, title: RATE_WORDS[n] }, G.star(false), h("span", { className: "ml-sr" }, n + (n === 1 ? " star — " : " stars — ") + RATE_WORDS[n])));
      })(i);
    }
    return h("fieldset", { className: cx("ml-rate", p.className) },
      h("legend", null, p.legend || "Your rating"),
      h("div", { className: "ml-rate-line" }, h("div", { className: "ml-rate-row" }, labels), h("span", { className: "ml-rate-hint", "aria-live": "polite" }, RATE_WORDS[v] || "not rated"))
    );
  }

  function ProductCard(p) {
    var soldOut = !!p.soldOut;
    var low = !soldOut && p.stock != null && p.stock <= (p.lowAt || 3);
    return h("article", { className: cx("ml-card", "ml-pcard", soldOut && "ml-pcard-soldout", p.className) },
      h("div", { className: "ml-pcard-img" },
        p.image ? h("img", { src: p.image, alt: p.imageAlt || p.name }) : null,
        h("span", { className: "ml-pcard-cat ml-label" }, p.category),
        p.flag && !soldOut ? h("span", { className: "ml-pcard-flag ml-label" }, p.flag) : null,
        soldOut ? h("span", { className: "ml-pcard-flag ml-pcard-flag-out ml-label" }, "Sold out") : null,
        h("button", { type: "button", className: "ml-pcard-fav", "aria-pressed": p.favorite ? "true" : "false", "aria-label": (p.favorite ? "Remove from favorites: " : "Add to favorites: ") + p.name, onClick: p.onFavorite }, G.heart(p.favorite))
      ),
      h("div", { className: "ml-pcard-body" },
        h("h3", { className: "ml-pcard-name" }, p.name),
        h("p", { className: "ml-pcard-meta" }, p.farmer, p.market ? " · " + p.market : ""),
        h("div", { className: "ml-pcard-foot" },
          h(PriceTag, { amount: p.price, unit: p.unit, was: p.was }),
          h("span", { className: cx("ml-pcard-stock", low && "ml-pcard-stock-low") }, soldOut ? "Back soon" : (low ? "Only " : "") + units(p.stock, p.unit) + " left")
        ),
        soldOut
          ? h(Button, { variant: "secondary", size: "sm", onClick: p.onNotify }, "Notify me when back")
          : h(Button, { variant: "primary", size: "sm", onClick: p.onAdd }, "Add to cart")
      )
    );
  }

  function StallCard(p) {
    var mono = (p.stallName || "?").replace(/^(Vườn|Nông trại|Nhà vườn|Trại|Sạp|Lò bánh|Farm|Garden|Stall)\s+/i, "").charAt(0);
    return h("article", { className: cx("ml-card", "ml-stall", p.className) },
      h("div", { className: "ml-stall-mono", "aria-hidden": "true" }, mono),
      h("div", null,
        h("h3", { className: "ml-stall-name" }, p.stallName),
        h("p", { className: "ml-stall-person" }, p.contactPerson),
        p.rating != null ? h("div", { style: { marginTop: 6 } }, h(Rating, { value: p.rating, count: p.reviews })) : null
      ),
      h("dl", { className: "ml-stall-facts" },
        h("dt", null, "Markets"), h("dd", null, (p.markets || []).join(", ")),
        h("dt", null, "Market days"), h("dd", null, p.days),
        h("dt", null, "Pickup"), h("dd", null, p.pickup),
        p.distance ? h("dt", null, "Distance") : null, p.distance ? h("dd", null, p.distance) : null
      ),
      h("div", { className: "ml-stall-actions" },
        h(Button, { variant: "primary", size: "sm", onClick: p.onView }, "See stall & this week's stock"),
        h(Button, { variant: "ghost", size: "sm", onClick: p.onDirections }, "Directions")
      )
    );
  }

  /* MarketCard (FR-010, FR-014): market by location + day, save as preferred market */
  var WEEK = [["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 0]];
  function MarketCard(p) {
    var open = p.openDays || [];
    return h("article", { className: cx("ml-card", "ml-market", p.className) },
      h("div", null, h("h3", { className: "ml-market-name" }, p.name), h("p", { className: "ml-market-addr" }, p.address)),
      h("button", { type: "button", className: "ml-pcard-fav ml-market-save", style: { position: "static" }, "aria-pressed": p.saved ? "true" : "false", "aria-label": (p.saved ? "Unsave " : "Save ") + p.name, onClick: p.onSave }, G.heart(p.saved)),
      h("ul", { className: "ml-market-days", "aria-label": "Market days" }, WEEK.map(function (d) {
        var on = open.indexOf(d[1]) >= 0;
        return h("li", { key: d[0], "data-open": on ? "true" : "false" }, d[0], h("span", { className: "ml-sr" }, on ? " open" : " closed"));
      })),
      h("p", { className: "ml-market-meta" },
        h("span", null, "Hours ", h("b", null, p.hours)),
        h("span", null, h("b", null, p.stalls), " stalls"),
        p.distance ? h("span", null, h("b", null, p.distance), " away") : null),
      h("div", { className: "ml-market-actions" },
        h(Button, { variant: "primary", size: "sm", onClick: p.onView }, "See stalls"),
        h(Button, { variant: "ghost", size: "sm", onClick: p.onDirections }, "Directions"))
    );
  }

  /* ReviewCard (FR-052/053): verified-purchase review + Farmer reply */
  function ReviewCard(p) {
    return h("article", { className: cx("ml-card", "ml-review", p.className) },
      h("div", { className: "ml-review-head" },
        h("div", { className: "ml-review-who" },
          h("span", { className: "ml-review-author" }, p.author),
          p.verified !== false ? h("span", { className: "ml-review-verified" }, G.check(), "Verified purchase") : null),
        h("span", { className: "ml-review-meta" }, p.date + (p.target ? " · " + p.target : ""))),
      h(Rating, { value: p.rating }),
      h("p", { className: "ml-review-text" }, p.text),
      p.reply ? h("div", { className: "ml-review-reply" }, h("b", null, p.reply.by + " replied · " + p.reply.date), p.reply.text) : null,
      p.actions ? h("div", { className: "ml-ticket-actions" }, p.actions) : null
    );
  }

  /* CartGroup (FR-030, D-01): one group = one Farmer = one order at checkout */
  function CartGroup(p) {
    var items = p.items || [];
    var total = items.reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    return h("section", { className: cx("ml-card", "ml-cart", p.className), "aria-label": "Order at " + p.stallName },
      h("div", { className: "ml-cart-head" },
        h("div", null,
          p.index ? h("div", { className: "ml-cart-no ml-label" }, "Order " + p.index + (p.of ? " of " + p.of : "")) : null,
          h("h3", { className: "ml-cart-stall" }, p.stallName),
          h("p", { className: "ml-cart-where" }, p.market + (p.pickup ? " · " + p.pickup : ""))),
        p.onChangeSlot ? h(Button, { variant: "ghost", size: "sm", onClick: p.onChangeSlot }, p.pickup ? "Change pickup time" : "Choose pickup time") : null),
      h("ul", { className: "ml-cart-items" }, items.map(function (i, k) {
        return h("li", { key: k, className: "ml-cart-item" },
          h("span", { className: "ml-cart-item-name" }, i.name, h("span", { className: "ml-cart-item-unit" }, vnd(i.price) + " / " + i.unit)),
          h(QtyStepper, { defaultValue: i.qty, max: i.max, unit: i.unit, label: i.name, onChange: p.onQty ? function (n) { p.onQty(k, n); } : undefined }),
          h("span", { className: "ml-cart-item-sum" }, vnd(i.qty * i.price)));
      })),
      h("div", { className: "ml-cart-foot" },
        h("span", { className: "ml-muted", style: { fontSize: 14 } }, "Pay at the stall on pickup"),
        h("span", { className: "ml-cart-total" }, vnd(total)))
    );
  }

  function OrderStatus(p) {
    var s = STATUS[p.status] ? p.status : "placed";
    return h("span", { className: cx("ml-status", "ml-status-" + s, p.className) }, G[s](), h("span", { className: "ml-status-text" }, p.label || STATUS[s]));
  }

  /* OrderTicket: one order = one Farmer (D-01), locked after cutoff (D-05) */
  function OrderTicket(p) {
    var items = p.items || [];
    var total = items.reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    var editable = !p.locked && (p.status === "placed" || p.status === "accepted");
    return h("article", { className: cx("ml-card", "ml-ticket", p.className) },
      h("div", { className: "ml-ticket-head" },
        h("div", null, h("div", { className: "ml-ticket-id ml-label" }, "Order " + p.code), h("h3", { className: "ml-ticket-stall" }, p.stallName)),
        h(OrderStatus, { status: p.status })),
      h("dl", { className: "ml-ticket-pick" },
        h("dt", null, "Market"), h("dd", null, p.market),
        h("dt", null, "Pickup"), h("dd", null, p.pickupDate + " · " + p.slot)),
      h("div", { className: "ml-ticket-perf", "aria-hidden": "true" }),
      h("ul", { className: "ml-ticket-items" }, items.map(function (i, k) {
        return h("li", { key: k }, h("span", null, h("span", { className: "q" }, i.qty + "×"), i.name), h("span", { className: "p" }, vnd(i.qty * i.price)));
      })),
      h("div", { className: "ml-ticket-total" }, h("span", null, "Pay on pickup"), h("span", { className: "p" }, vnd(total))),
      p.cutoff ? h("p", { className: "ml-ticket-cut" }, p.locked ? G.lock() : G.clock(),
        h("span", null, p.locked ? "Cutoff passed at " + p.cutoff + ". To change it, contact the stall directly." : "Edit or cancel before " + p.cutoff + ". After that the order is locked.")) : null,
      editable ? h("div", { className: "ml-ticket-actions" },
        h(Button, { variant: "secondary", size: "sm", onClick: p.onEdit }, "Edit order"),
        h(Button, { variant: "danger", size: "sm", onClick: p.onCancel }, "Cancel order")) : null,
      p.status === "completed" && p.onReview ? h("div", { className: "ml-ticket-actions" },
        h(Button, { variant: "primary", size: "sm", onClick: p.onReview }, "Review stall & products"),
        h(Button, { variant: "ghost", size: "sm", onClick: p.onReorder }, "Reorder")) : null,
      p.children || null
    );
  }

  function StatTile(p) {
    return h("div", { className: cx("ml-card", "ml-stat", p.highlight && "ml-stat-hl", p.className) },
      h("span", { className: "ml-stat-label ml-overline" }, p.label),
      h("span", { className: "ml-stat-value" }, p.value),
      p.note ? h("span", { className: "ml-stat-note" }, p.note) : null
    );
  }

  /* DataTable: data table for Farmer/Admin dashboards. columns: [{key,label,align:'num'|'actions',render(row)}] */
  function DataTable(p) {
    var cols = p.columns || [];
    return h("div", { className: cx("ml-table-wrap", p.className) },
      h("table", { className: "ml-table" },
        p.caption ? h("caption", null, p.caption) : null,
        h("thead", null, h("tr", null, cols.map(function (c) { return h("th", { key: c.key, scope: "col", className: c.align }, c.label); }))),
        h("tbody", null, (p.rows || []).map(function (r, i) {
          return h("tr", { key: r.id || i, "data-new": r._new ? "true" : undefined }, cols.map(function (c) {
            return h("td", { key: c.key, className: c.align }, c.render ? c.render(r) : r[c.key]);
          }));
        }))
      )
    );
  }

  function Pagination(p) {
    var page = p.page || 1, pages = p.pages || 1, list = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
      else if (list[list.length - 1] !== "…") list.push("…");
    }
    function go(n) { return function () { if (p.onChange) p.onChange(n); }; }
    return h("nav", { "aria-label": "Pagination", className: p.className },
      h("ul", { className: "ml-pages" },
        h("li", null, h("button", { type: "button", disabled: page <= 1, onClick: go(page - 1), "aria-label": "Previous page" }, "‹")),
        list.map(function (n, k) {
          return n === "…" ? h("li", { key: "g" + k, className: "gap", "aria-hidden": "true" }, "…")
            : h("li", { key: n }, h("button", { type: "button", "aria-current": n === page ? "page" : undefined, onClick: go(n), "aria-label": "Page " + n }, n));
        }),
        h("li", null, h("button", { type: "button", disabled: page >= pages, onClick: go(page + 1), "aria-label": "Next page" }, "›"))
      )
    );
  }

  /* ================= Feedback ================= */

  /* Banner: info (cart split), warning (cutoff soon), danger, announce (FR-077) */
  function Banner(p) {
    var tone = p.tone || "info";
    var icon = tone === "announce" ? G.megaphone() : tone === "info" ? G.info() : G.alert();
    return h("div", { className: cx("ml-banner", "ml-banner-" + tone, p.className), role: tone === "danger" ? "alert" : "status" },
      icon,
      h("div", { className: "ml-banner-body" },
        p.title ? h("p", { className: "ml-banner-title" }, p.title) : null,
        p.children ? h("p", { className: "ml-banner-text" }, p.children) : null),
      p.action || null,
      p.onClose ? h("button", { type: "button", className: "ml-banner-close", "aria-label": "Dismiss", onClick: p.onClose }, G.close()) : null
    );
  }

  function Toast(p) {
    var tone = p.tone || "success";
    return h("div", { className: cx("ml-toast", tone === "error" && "ml-toast-error", p.className), role: tone === "error" ? "alert" : "status" },
      tone === "error" ? G.alert() : G.okCircle(),
      h("span", { className: "ml-toast-text" }, p.children),
      p.actionLabel ? h("button", { type: "button", className: "ml-toast-action", onClick: p.onAction }, p.actionLabel) : null
    );
  }

  /* Dialog: confirm cancel order, decline order, delete product. inline=true is for previews only. */
  function Dialog(p) {
    var id = useId("ml-d");
    if (p.open === false) return null;
    return h("div", { className: cx("ml-scrim", p.inline && "ml-scrim-inline"), onClick: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h("div", { className: cx("ml-dialog", p.className), role: p.tone === "danger" ? "alertdialog" : "dialog", "aria-modal": "true", "aria-labelledby": id },
        h("h2", { className: "ml-dialog-title", id: id }, p.title),
        h("div", { className: "ml-dialog-body" }, p.children),
        p.actions ? h("div", { className: "ml-dialog-actions" }, p.actions) : null)
    );
  }

  /* NotificationList (FR-041/042): accepted / declined / ready / restock / announce */
  var NOTE_STYLE = {
    accepted: ["accepted", "status-accepted"], declined: ["declined", "status-declined"], ready: ["ready", "status-ready"],
    restock: ["restock", "brand-tint"], announce: ["megaphone", "highlight"]
  };
  function NotificationList(p) {
    var items = p.items || [];
    var unread = items.filter(function (n) { return n.unread; }).length;
    return h("section", { className: cx("ml-notes", p.className), "aria-label": "Notifications" },
      h("div", { className: "ml-notes-head" }, h("b", null, "Notifications", unread ? h("span", { className: "ml-muted", style: { fontWeight: 400, fontSize: 14 } }, " · " + unread + " unread") : null),
        h(Button, { variant: "ghost", size: "sm", onClick: p.onReadAll }, "Mark all as read")),
      h("ul", null, items.map(function (n, k) {
        var s = NOTE_STYLE[n.kind] || NOTE_STYLE.announce;
        var bg = s[1].indexOf("status-") === 0 ? "var(--" + s[1] + "-bg)" : "var(--" + s[1] + ")";
        var fg = s[1].indexOf("status-") === 0 ? "var(--" + s[1] + "-ink)" : "var(--ink)";
        var glyph = s[0] === "megaphone" ? Svg([P("M2 6.5v3h2.5l5 3v-9l-5 3z"), P("M12 5.5a3.5 3.5 0 010 5")]) : G[s[0]]();
        return h("li", { key: k, className: "ml-note", "data-unread": n.unread ? "true" : "false" },
          h("span", { className: "ml-note-ico", style: { background: bg, color: fg } }, glyph),
          h("div", null, h("p", { className: "ml-note-title" }, n.title, n.unread ? h("span", { className: "ml-note-dot" }, h("span", { className: "ml-sr" }, "unread")) : null), n.text ? h("p", { className: "ml-note-text" }, n.text) : null),
          h("span", { className: "ml-note-time" }, n.time));
      }))
    );
  }

  /* ChatMessage (FR-090/091/092): shopping assistant; shows the detected intent */
  function ChatMessage(p) {
    var bot = p.from !== "user";
    return h("div", { className: cx("ml-msg", bot ? "ml-msg-bot" : "ml-msg-user", p.className) },
      h("div", { className: "ml-msg-bubble" }, p.children),
      h("div", { className: "ml-msg-meta" }, bot ? "MarketLink assistant" : "You", p.time ? h("span", null, "· " + p.time) : null, p.intent ? h("span", { className: "ml-msg-intent" }, "Intent: " + p.intent) : null),
      p.suggestions ? h("div", { className: "ml-msg-suggest" }, p.suggestions.map(function (s) { return h(Chip, { key: s, onClick: p.onSuggest ? function () { p.onSuggest(s); } : undefined }, s); })) : null
    );
  }

  /* MapPin: market = square, stall = round (different shape, not just color) */
  function MapPin(p) {
    var kind = p.kind === "stall" ? "stall" : "market";
    return h("span", { className: cx("ml-pin", "ml-pin-" + kind, p.selected && "ml-pin-selected", p.className), role: "img", "aria-label": (kind === "market" ? "Market: " : "Stall: ") + (p.label || "") },
      h("span", { className: "ml-pin-head" }, p.text || (kind === "market" ? "M" : "S")),
      h("span", { className: "ml-pin-stem" }),
      h("span", { className: "ml-pin-dot" }),
      p.label ? h("span", { className: "ml-pin-label", "aria-hidden": "true" }, p.label) : null
    );
  }
  // Leaflet: L.divIcon({ html: MarketLink.pinHTML('stall','Vườn Cô Tư'), className: '', iconSize: [34, 48], iconAnchor: [17, 48] })
  function pinHTML(kind, label, text) {
    var k = kind === "stall" ? "stall" : "market";
    var esc = function (s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    return '<span class="ml-pin ml-pin-' + k + '"><span class="ml-pin-head">' + esc(text || (k === "market" ? "M" : "S")) + '</span><span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' + (label ? '<span class="ml-pin-label">' + esc(label) + "</span>" : "") + "</span>";
  }

  /* DataState (FR-084): loading / empty / error */
  function DataState(p) {
    var kind = p.kind || "empty";
    if (kind === "loading") {
      return h("div", { className: cx("ml-card", "ml-state", p.className), role: "status", "aria-live": "polite" },
        h("span", { className: "ml-sr" }, p.title || "Loading"),
        h("span", { className: "ml-skel", style: { width: "60%", height: 20 } }),
        h("span", { className: "ml-skel", style: { width: "90%", height: 14 } }),
        h("span", { className: "ml-skel", style: { width: "75%", height: 14 } }));
    }
    return h("div", { className: cx("ml-state", "ml-state-" + kind, p.className), role: kind === "error" ? "alert" : undefined },
      h("h3", { className: "ml-state-title" }, p.title),
      p.text ? h("p", { className: "ml-state-text" }, p.text) : null,
      p.action || null);
  }

  window.MarketLink = Object.assign(window.MarketLink || {}, {
    Logo: Logo, SiteHeader: SiteHeader, SiteFooter: SiteFooter,
    Button: Button, Field: Field, Checkbox: Checkbox, SearchBar: SearchBar, Chip: Chip, Tabs: Tabs,
    DayChips: DayChips, SlotPicker: SlotPicker, QtyStepper: QtyStepper,
    PriceTag: PriceTag, Rating: Rating, RatingInput: RatingInput,
    ProductCard: ProductCard, StallCard: StallCard, MarketCard: MarketCard, ReviewCard: ReviewCard,
    CartGroup: CartGroup, OrderStatus: OrderStatus, OrderTicket: OrderTicket,
    StatTile: StatTile, DataTable: DataTable, Pagination: Pagination,
    Banner: Banner, Toast: Toast, Dialog: Dialog, NotificationList: NotificationList, ChatMessage: ChatMessage,
    MapPin: MapPin, DataState: DataState,
    vnd: vnd, units: units, pinHTML: pinHTML, icons: G, STATUS_LABELS: STATUS
  });
})();
