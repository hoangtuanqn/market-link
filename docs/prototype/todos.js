window.PT_TODOS = [
 {
  "role": "public",
  "file": "about.html",
  "screen": "About us",
  "text": "Imagery · The About us carousel uses Unsplash placeholder photos, none of them a Vietnamese farmers market. The design system asks for photos shot by the team or licensed with a credit in the ReadMe. Replace all four and add the credits."
 },
 {
  "role": "public",
  "file": "about.html",
  "screen": "About us",
  "text": "FR-082 · Team names and photos are not in the repository. The roles and ownership below come from .ai/REQUIREMENTS.md; add the real names, and a photo each if the team wants them."
 },
 {
  "role": "public",
  "file": "about.html",
  "screen": "About us",
  "text": "SRS 1.6 · Every AI tool used must be acknowledged in the submitted documentation. List them here and in the ReadMe before submission."
 },
 {
  "role": "public",
  "file": "contact.html",
  "screen": "Contact us",
  "text": "FR-083 · Team contact email, phone and office address are not in the repo. The SRS asks for static team contact information plus a map of the location."
 },
 {
  "role": "public",
  "file": "feedback.html",
  "screen": "Feedback form",
  "text": "FR-081 · What happens after feedback is sent (reply channel, response time, visible status) is not specified. The admin inbox exists in the API contract but not in the SRS."
 },
 {
  "role": "public",
  "file": "forgot-password.html",
  "screen": "Forgot password",
  "text": "FR-007 · The link lifetime shown here is 30 minutes and the sender is unnamed. Real email is FR-043, a NICE, so the team needs to decide how the reset email is actually delivered before this works end to end."
 },
 {
  "role": "public",
  "file": "login.html",
  "screen": "Sign in",
  "text": "Out of scope · Social sign-in is not in the SRS. FR-001 and FR-002 require name, phone, email and address at registration, and a Farmer also needs a stall name and admin approval, none of which a Google or Facebook account supplies. It needs a new FR, an OAuth provider, a users.auth_provider column, a rule for linking a social account to an existing email, and a 'complete your profile' step before the first order."
 },
 {
  "role": "public",
  "file": "login.html",
  "screen": "Sign in",
  "text": "Branding · The two buttons are plain text. Google and Facebook both require their official mark, wording and minimum sizes. Take the assets from each provider's brand guidelines before this ships."
 },
 {
  "role": "public",
  "file": "login.html",
  "screen": "Sign in",
  "text": "FR-003 · Session length and 'keep me signed in': the SRS asks for a secure session but does not say how long a session lasts or whether remember-me exists."
 },
 {
  "role": "public",
  "file": "map.html",
  "screen": "Market map",
  "text": "FR-013 · 'Directions to the selected pickup point': the prototype links to OSM directions with the destination only. Whether to pass the customer's saved address as the start point is not decided."
 },
 {
  "role": "public",
  "file": "markets.html",
  "screen": "Markets by location and day",
  "text": "FR-010 · Location filter: the SRS says 'by location' but not whether that is a district list, the browser's location, or a radius from the customer's address. Prototype uses the district list plus the saved address."
 },
 {
  "role": "public",
  "file": "product.html",
  "screen": "Product detail",
  "text": "FR-062 · The product form takes one image. Whether a stall can upload several photos, and where they are stored, is not decided. The gallery here shows four frames as a proposal."
 },
 {
  "role": "public",
  "file": "product.html",
  "screen": "Product detail",
  "text": "Proposal from Chợ Tốt · Response rate and last-active time build trust on a marketplace, but neither is in the SRS or the schema. Decide whether to measure and store them."
 },
 {
  "role": "public",
  "file": "product.html",
  "screen": "Product detail",
  "text": "FR-062 · The SRS product entity is name, category, price, unit, quantity, description and image. Grown in, cut, and keeps are extra fields this page shows; they need columns and form inputs, or they should be folded into the description."
 },
 {
  "role": "public",
  "file": "product.html",
  "screen": "Product detail",
  "text": "Proposal from Chợ Tốt · Review tags (Ready on time, Fresh as described…) summarise a stall faster than free text. The SRS review is a rating plus a comment, so tags would need a new table and a step in the review form."
 },
 {
  "role": "public",
  "file": "register-customer.html",
  "screen": "Customer registration",
  "text": "FR-001/003 · Password rules (length, complexity) are not defined in the SRS. Prototype shows 'at least 8 characters' as a placeholder rule."
 },
 {
  "role": "public",
  "file": "register-farmer.html",
  "screen": "Farmer registration",
  "text": "FR-071 · Approval time and what the admin checks are not specified. Prototype says 'an admin reviews the stall' without a promised time."
 },
 {
  "role": "public",
  "file": "reset-password.html",
  "screen": "Set a new password",
  "text": "FR-001/003/007 · Password rules (length, character classes, blocklist) are not defined anywhere in the SRS or the decisions. Eight characters is a placeholder used across the registration, account and reset screens."
 },
 {
  "role": "public",
  "file": "stall.html",
  "screen": "Stall profile",
  "text": "Proposal from Chợ Tốt · Review tags (Ready on time, Fresh as described…) let a shopper read a stall at a glance. The SRS review is a rating plus a comment, so tags need a new table and a step in the review form."
 },
 {
  "role": "customer",
  "file": "account.html",
  "screen": "Account",
  "text": "Feature catalog · 'View and update personal details' and 'change password' are marked (proposal), not in the SRS. Keep or cut; the API contract has GET /auth/me but no PUT."
 },
 {
  "role": "customer",
  "file": "assistant.html",
  "screen": "Shopping assistant",
  "text": "FR-090 · Which model or service does the classification (rule-based, a hosted LLM, tawk.to/Zapier as the SRS suggests) is decided in docs/chatbot-design.md, not in the SRS. Prototype shows the UI only."
 },
 {
  "role": "customer",
  "file": "become-farmer.html",
  "screen": "Apply to sell",
  "text": "Schema · Photos, video, crops, plot address, plot size and growing method have no columns in db/schema.sql. They need either new columns on farmer_profiles or a farmer_applications table, a Flyway migration under R-03, and a decision on where the files live and how long they are kept. Only LEAD may change the schema (R-02)."
 },
 {
  "role": "customer",
  "file": "become-farmer.html",
  "screen": "Apply to sell",
  "text": "Requirements · FR-002 describes Farmer registration as its own sign-up. Applying from an existing Customer account is a second route and needs its own FR. FR-005 also has to be reworded, because a Farmer now keeps every Customer permission instead of being a separate role."
 },
 {
  "role": "customer",
  "file": "become-farmer.html",
  "screen": "Apply to sell",
  "text": "Policy · What a rejected applicant sees, whether they may apply again, and after how long, is not decided. The schema has farmer_profiles.reject_reason but no screen or rule for reapplying."
 },
 {
  "role": "customer",
  "file": "dashboard.html",
  "screen": "Customer dashboard",
  "text": "SRS 1.6 · 'Customers … securely access their dashboard': the SRS names a customer dashboard but does not list what is on it. Prototype shows next pickups, counts and favorites; confirm the content."
 },
 {
  "role": "customer",
  "file": "favorites.html",
  "screen": "Favorites and saved markets",
  "text": "FR-014 (SHOULD) · 'route-friendly pickup details' is not defined beyond directions. The prototype sorts saved markets first and starts directions from the saved address."
 },
 {
  "role": "customer",
  "file": "messages.html",
  "screen": "Messages with a stall",
  "text": "Out of scope · Customer-to-Farmer messaging is not in the SRS or in .ai/REQUIREMENTS.md. R-07 says do not build what is not listed. Needs a new FR, a messages table, an unread badge, and a rule on whether a message can change an order. Note the SRS does list an AI chatbot (FR-090/091), which is a different thing."
 },
 {
  "role": "customer",
  "file": "review.html",
  "screen": "Review stall and products",
  "text": "FR-050/051 · Whether a customer can edit or delete a published review, and whether photos are allowed, is not specified."
 },
 {
  "role": "customer",
  "file": "settings.html",
  "screen": "Settings",
  "text": "Proposal · A settings screen is not in the SRS. Three of its choices also cut across decisions already made: the locale decision fixes VND, dd/MM/yyyy and 24-hour, the design system says no dark mode until every MUST is done, and the UI is English only. Each needs LEAD or FE1 before it is built."
 },
 {
  "role": "farmer",
  "file": "messages.html",
  "screen": "Messages with customers",
  "text": "Out of scope · Farmer-to-Customer messaging is not in the SRS or in .ai/REQUIREMENTS.md. R-07 says do not build what is not listed. It also raises questions the SRS does not answer: who may start a thread, whether a stall can be messaged without an order, and how abuse is reported and moderated."
 },
 {
  "role": "farmer",
  "file": "notifications.html",
  "screen": "Notifications (Farmer)",
  "text": "D-11 lists 4 notification triggers, all for customers. Notifying the Farmer of a new, edited or cancelled order is marked (proposal) in the feature catalog and needs a decision."
 },
 {
  "role": "farmer",
  "file": "order.html",
  "screen": "Order detail (Farmer)",
  "text": "FR-065 · Whether the Farmer sees the customer's full phone number and address, and from which status, is not specified. Prototype shows the full phone once the order exists."
 },
 {
  "role": "farmer",
  "file": "overview.html",
  "screen": "Overview",
  "text": "Design system · The SiteHeader guide defines one horizontal bar on `board` for every role. Farmer and Admin now use a board-green sidebar with grouped navigation and a quiet work-area header instead. FE1 and LEAD either fold this into docs/design-system as a second shell, or ask for the top bar back."
 },
 {
  "role": "farmer",
  "file": "pending.html",
  "screen": "Waiting for approval / suspended",
  "text": "FR-071 · What a rejected Farmer sees and whether they can re-apply is not specified. The API contract has a reject reason; the screen for it is not designed yet."
 },
 {
  "role": "farmer",
  "file": "pending.html",
  "screen": "Waiting for approval / suspended",
  "text": "D-09 · How a suspended Farmer is reinstated (who decides, through which screen) is not specified."
 },
 {
  "role": "farmer",
  "file": "product-form.html",
  "screen": "Add or edit product",
  "text": "FR-062 · The 'flag' text on the product tag is a design-system idea, not an SRS field. Keep it (needs a column) or drop it."
 },
 {
  "role": "farmer",
  "file": "product-form.html",
  "screen": "Add or edit product",
  "text": "Schema · products.unit is already VARCHAR(20), so a stall naming its own unit needs no migration. The plural has nowhere to live, and English cannot derive the plural of a phrase like tray of 30. Proposal for LEAD: a nullable products.unit_plural VARCHAR(20) falling back to the guess. order_items.unit snapshots the unit at order time, so it needs the plural too."
 },
 {
  "role": "farmer",
  "file": "product-form.html",
  "screen": "Add or edit product",
  "text": "FR-062 · Image handling: the API contract sends image_url, so where files are uploaded and stored (local disk, S3-compatible bucket, size limit) is not decided."
 },
 {
  "role": "farmer",
  "file": "promote.html",
  "screen": "Promote & listing allowance",
  "text": "Design system · Banner has an `action` slot (components/Banner.md: \"one button, optional\") but marketlink-components.css has no class for it, and .ml-banner is a flex row with no flex-wrap. At 375px the dashboard work area is 292px, so any action beside .ml-banner-body starves it: measured 0px wide, with the text broken to one word per line. The prototype now keeps its notes inside the body, but a real action button still collapses the text. FE1 to add .ml-banner-action { flex: none } plus flex-wrap on .ml-banner, or state that an action is desktop-only."
 },
 {
  "role": "farmer",
  "file": "promote.html",
  "screen": "Promote & listing allowance",
  "text": "Out of scope · Paid promotion and paid listings are not in .ai/REQUIREMENTS.md, and the SRS says the application will have no payment gateway. It needs a new FR, tables for credit, promotions and transactions, a Flyway migration under R-03, and a decision on how a Farmer actually pays: cash to the team, bank transfer reconciled by an admin, or a gateway the SRS currently forbids."
 },
 {
  "role": "farmer",
  "file": "settings.html",
  "screen": "Settings",
  "text": "Proposal · A settings screen is not in the SRS. The selling defaults here overlap FR-060, FR-061 and FR-067, which put cutoff and slot settings on the stall profile. Decide which screen owns them so there is one source of truth."
 },
 {
  "role": "farmer",
  "file": "slots.html",
  "screen": "Pickup slots",
  "text": "FR-067 · Cancelling a whole market day or session (holiday, rain) is marked (proposal) in the feature catalog and not in the SRS; what happens to placed orders then is undecided."
 },
 {
  "role": "farmer",
  "file": "slots.html",
  "screen": "Pickup slots",
  "text": "FR-067 · Declaring a day away has no requirement and no table. What happens to the orders is already covered — declining returns stock under D-02 and D-04 has the transition — but there is nowhere to record the day itself, so a stall would have to decline each order by hand. This needs a new FR and a farmer_absences table (farmer_id, market_id, absent_on, reason), plus a Flyway migration under R-03. LEAD owns schema.sql (R-02)."
 },
 {
  "role": "farmer",
  "file": "stock-week.html",
  "screen": "This week's stock",
  "text": "FR-063 · Whether the template carries a per-day price (the API contract has default_price) or only quantities, and whether applying it overwrites manual edits for the week, needs a decision."
 },
 {
  "role": "admin",
  "file": "account.html",
  "screen": "Admin profile",
  "text": "Proposal · A session list, an audit trail and two-factor sign-in are not in the SRS. FR-004 only asks for a secure admin sign-in on a separate dashboard. An admin can change prices and suspend stalls, so the team should decide how much of this is worth building."
 },
 {
  "role": "admin",
  "file": "announcements.html",
  "screen": "Announcements",
  "text": "FR-077 · Audience targeting (everyone / customers / farmers / one market) and scheduling are prototype additions; the SRS only says 'publish platform-wide notifications or announcements'."
 },
 {
  "role": "admin",
  "file": "customers.html",
  "screen": "Customers",
  "text": "FR-072 · Which customer details an admin may see (address, full phone) and whether an admin can edit or delete a customer is not specified. Prototype shows contact details read-only."
 },
 {
  "role": "admin",
  "file": "farmer.html",
  "screen": "Farmer registration detail",
  "text": "Policy · An applicant with a poor record as a customer, for example repeated cancellations, may still be a good grower. Whether customer history can be a reason to reject, and who decides, is not written down."
 },
 {
  "role": "admin",
  "file": "feedback.html",
  "screen": "Feedback inbox",
  "text": "FR-081 · The SRS defines the feedback form, not the admin inbox. The API contract has GET /api/admin/feedbacks. Where it sits in the admin menu and whether admins reply from here needs a decision."
 },
 {
  "role": "admin",
  "file": "login.html",
  "screen": "Admin sign in",
  "text": "FR-004 · Whether the admin area lives on a separate path (/admin) or a separate host, and whether admins can reset their password themselves, is not decided."
 },
 {
  "role": "admin",
  "file": "market-form.html",
  "screen": "Add or edit market",
  "text": "FR-073 · One-off market closures have no requirement and no table. db/schema.sql has markets.operating_days but nothing for a single date, so this needs a new FR, a market_closures table (market_id, closed_on, reason, handling, created_by) and a Flyway migration under R-03. LEAD owns schema.sql and the contract (R-02), so this is a proposal, not a change."
 },
 {
  "role": "admin",
  "file": "market-form.html",
  "screen": "Add or edit market",
  "text": "D-04 / D-05 · What happens to orders already placed for a closed day is not decided. The prototype offers three handlings and defaults to moving them, which is the kindest to the customer but assumes the stall sells on the next market day too. Moving an order changes its pickup_date and its cutoff_at, which no decision covers; cancelling has to return stock the way D-02 does for a decline, and the order should end as cancelled rather than declined because the stall did nothing wrong."
 },
 {
  "role": "admin",
  "file": "markets.html",
  "screen": "Markets",
  "text": "FR-073 · Closed days are now a panel on the market form, so a closure has somewhere to live instead of only being announced. What it still lacks is a requirement and a table: db/schema.sql has markets.operating_days but nothing for a single date. See the open questions on the market form for the schema and for what happens to orders already placed."
 },
 {
  "role": "admin",
  "file": "moderation.html",
  "screen": "Moderation",
  "text": "FR-074 · The platform guidelines that define 'inappropriate' (advertising, off-platform contact, abuse…) are not written yet. Moderation reasons in the prototype are examples."
 },
 {
  "role": "admin",
  "file": "overview.html",
  "screen": "Admin dashboard",
  "text": "Proposal · Scoping the whole dashboard to one market is not in the SRS. FR-075 puts a market filter on the reports screen only. Decide whether the scope is global and remembered per user, or stays a per-screen filter."
 },
 {
  "role": "admin",
  "file": "pricing.html",
  "screen": "Pricing & allowances",
  "text": "Out of scope · Platform revenue is not in .ai/REQUIREMENTS.md and the SRS excludes a payment gateway. Needs a new FR, tables for prices, credit and transactions with a price history so an old order keeps the price it was charged, a Flyway migration under R-03, and a rule on who may change a price."
 },
 {
  "role": "admin",
  "file": "reports.html",
  "screen": "Reports",
  "text": "FR-075 · The SRS names three reports but not the date ranges, not whether 'most active' counts orders or products, and not whether reports can be exported. The SRS example schema also has a Reports table with generated_by and report_type, so whether a report is stored or computed live is still open."
 },
 {
  "role": "admin",
  "file": "reports.html",
  "screen": "Reports",
  "text": "Design system · docs/design-system has no data-visualisation tokens. These charts use brand for the period on screen and twine for the one before it, the only pair in the token set that clears the dataviz validator on CVD separation, the normal-vision floor and 3:1 contrast. The brand palette is muted, so it also fails that validator's chroma floor. FE1 should add a proper chart ramp rather than leave charts borrowing twine, which the brand book calls decoration only."
 },
 {
  "role": "admin",
  "file": "revenue.html",
  "screen": "Platform revenue",
  "text": "Out of scope · Platform revenue reporting depends on the paid-promotion model, which is not in .ai/REQUIREMENTS.md, and the SRS rules out a payment gateway. It needs a new FR and tables for transactions and credit before any of these numbers can be real."
 },
 {
  "role": "admin",
  "file": "revenue.html",
  "screen": "Platform revenue",
  "text": "Accounting · Revenue here is recognised when credit is spent, not when a stall tops up, so unspent credit is a liability rather than income. A bundle is treated the same way, which is why bundles are not a fifth source. LEAD and whoever handles the books should confirm that policy before any of it is built."
 },
 {
  "role": "admin",
  "file": "settings.html",
  "screen": "Settings",
  "text": "Proposal · Platform defaults are not in the SRS. Whether changing a default rewrites stalls that never touched theirs, or only applies to new stalls, has to be decided before this is built."
 }
];
