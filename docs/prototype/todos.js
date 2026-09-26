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
  "text": "Consent · Asking an existing user to accept the terms every time they sign in is unusual: consent is normally taken once at registration, and an account created before these pages existed has nothing recorded. Three ways to go, LEAD to pick: keep the box on every sign-in as it is here; show a plain line of text with the two links and no checkbox; or ask only once, when the accepted version is older than the current one. Whichever it is, it needs an FR and somewhere to store what was accepted."
 },
 {
  "role": "public",
  "file": "login.html",
  "screen": "Sign in",
  "text": "Partly built · Google sign-in is no longer a proposal: GoogleOAuthClient and the migration V20260924003__create_user_social_accounts_table.sql are merged, linking on the Google sub rather than the email, and Facebook was dropped on purpose. Two things are still open. First, that migration made users.password_hash and users.phone nullable, but FR-001 requires a contact number and an address and a stall has to be able to ring a customer about an order, and nothing yet forces those in — hence the complete-your-profile screen next to this one, which still needs an FR and a rule for when it is enforced. Second, GoogleOAuthClient knows nothing about roles, so if the admin area ever accepts Google it needs an allowlist of which Google accounts may be admin, or FR-004's separate admin area becomes a button anyone with a Google account can press."
 },
 {
  "role": "public",
  "file": "login.html",
  "screen": "Sign in",
  "text": "Branding · The button is plain text. Google requires its official mark, wording and minimum sizes for a "
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
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Privacy · Exactly which Customer fields a Farmer sees on an order is not defined. docs/api-contract.md returns the order with its items and history but never lists the customer fields, and db/schema.sql keeps name, phone and address on users with no view in between. LEAD to fix the field list: name and phone are clearly needed for pickup, the home address probably is not."
 },
 {
  "role": "public",
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Privacy · Whether a cookie or consent banner is needed is not decided. Today only sign-in and cart storage are used, which is usually exempt, but the pages also load Google Fonts and OpenStreetMap tiles from third parties. LEAD to decide whether a banner is required, and FE1 to say whether self-hosting the two fonts removes the question."
 },
 {
  "role": "public",
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Privacy · Deleting an account, exporting your data and how long anything is kept are all undefined. .ai/REQUIREMENTS.md has no FR for any of them and docs/api-contract.md has no endpoint; the only delete in the product is the soft delete on products. LEAD to decide whether deletion and export are in scope at all, and to set a retention period for orders, chat_messages and feedbacks."
 },
 {
  "role": "public",
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Privacy · The entity responsible for the data, and an address to send a privacy request to, are not in the repository. Contact us has the same gap open against FR-083. Both pages should end up with the same details."
 },
 {
  "role": "public",
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Privacy · No minimum age is set anywhere in the SRS or the decisions, and registration does not ask for a date of birth. LEAD to decide whether a minimum age applies and whether it is worth asking."
 },
 {
  "role": "public",
  "file": "privacy.html",
  "screen": "Privacy policy",
  "text": "Out of scope · Privacy policy and Terms of service are not in the SRS or in .ai/REQUIREMENTS.md, and R-07 says do not build what is not listed. Both pages exist because the sign-in and registration screens now ask users to accept them. They need a new FR, and the text needs review by someone qualified before submission."
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
  "file": "register-customer.html",
  "screen": "Customer registration",
  "text": "Consent · Accepting the terms at registration is not in the SRS: FR-001 lists name, contact number, email and address, and nothing else. It needs a new FR and a place to record the acceptance — a users.terms_accepted_at column and the version accepted — so the tick is not lost the moment the form is submitted. Farmer registration needs the same treatment."
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
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "Terms · Refunds, no-shows and disputes are not defined anywhere. The SRS, docs/decisions.md and docs/api-contract.md are all silent: there is no payment in the product, so there is no refund flow, no no-show penalty and no dispute queue. LEAD to say whether the platform stays out of it (current wording) or whether a dispute needs an FR, a status and an admin screen."
 },
 {
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "FR-072 · What a deactivated Customer sees, and what happens to their orders in progress, is not defined. D-09 covers the suspended Farmer case in detail but says nothing about the Customer side. LEAD to decide: sign-in blocked or read-only, and whether running orders continue as they do for a suspended stall."
 },
 {
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "Terms · The legal entity behind MarketLink, its address and its registration are not in the repository. A terms page needs to name who the agreement is with. For the TechWiz submission this may be the team name; LEAD to confirm what goes here."
 },
 {
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "Terms · How users are told about a change to the terms is not defined. The platform has in-app notifications and an announcements table an admin can publish to, which would be the obvious channel, but no FR says so and no notification type exists for it."
 },
 {
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "Consent · No FR covers accepting the terms and privacy policy, and R-07 says not to build what is not listed. The checkbox now on the sign-in and customer registration screens needs a new FR, plus a decision on storage: a users.terms_accepted_at column, which version was accepted, and what happens to accounts created before this existed. Until then the box is UI only."
 },
 {
  "role": "public",
  "file": "terms.html",
  "screen": "Terms of service",
  "text": "Out of scope · Terms of service and Privacy policy are not in the SRS or in .ai/REQUIREMENTS.md, and R-07 says do not build what is not listed. Both pages exist because the sign-in and registration screens now ask users to accept them. They need a new FR, and the text needs review by someone qualified before submission."
 },
 {
  "role": "customer",
  "file": "account.html",
  "screen": "Account",
  "text": "Proposal · A profile photo is not in the SRS. API proposed in docs/proposals/avatar-api.md; LEAD to confirm."
 },
 {
  "role": "customer",
  "file": "account.html",
  "screen": "Account",
  "text": "Proposal · Personal achievements and tiers are not in the SRS; LEAD asked for them 25/09. Backend: GET /api/v1/auth/me/achievements (not in docs/api-contract.md yet). A tier needs all three of orders collected, total spent and completion rate (completed ÷ completed + cancelled by the customer); declined orders never count. Thresholds live in app.tiers. The orders table does not exist yet (FR-030…038), so until it does the app shows 'No order figures yet' and Bronze."
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
  "text": "FR-090 to FR-092 are optional in the SRS and SHOULD in .ai/REQUIREMENTS.md, so the whole screen can be cut if hours run short. That fact used to sit in a kicker above the heading, where a real user would have read "
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
  "file": "change-password.html",
  "screen": "Change password",
  "text": "Feature catalog · 'change password' is marked (proposal), not in the SRS. In the app this is /account/password (PR #125), opened from the Password & security card on Account."
 },
 {
  "role": "customer",
  "file": "complete-profile.html",
  "screen": "Finish your account",
  "text": "FR-001 · This screen fills a hole that is already in the merged code. V20260924003__create_user_social_accounts_table.sql made users.password_hash and users.phone nullable so a Google account can exist without them, but FR-001 requires a contact number and an address at registration and nothing yet forces them in. It needs an FR of its own and one decision: where the block goes. The prototype lets the person browse and blocks at checkout, which is the kindest reading of the requirement, but blocking at sign-in is also defensible and is simpler to build. LEAD to pick one."
 },
 {
  "role": "customer",
  "file": "complete-profile.html",
  "screen": "Finish your account",
  "text": "FR-001 / D-08 · Two smaller questions this screen raises. A Google account can come with an email that already belongs to a password account here, and nothing says whether the two are linked, kept apart, or the sign-in is refused; the social table has a unique key on (provider, provider_user_id) but that does not answer it. And an address typed once is treated as the only address, while D-08 allows a household to share one account, where a second address is likely. Neither is in the SRS."
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
  "file": "order.html",
  "screen": "Order detail",
  "text": "FR-114 (order part) · Messaging from an order and pinning the order to a message wait for the order module (GET /orders/{id}), which dev does not have yet. Product and stall pages already have the button."
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
  "text": "Out of scope · Two-step verification is not in the SRS. §1.7 asks only for adequate security measures such as authentication. It needs a new FR, plus admin_mfa(user_id, secret encrypted, enabled, confirmed_at) and mfa_recovery_codes(id, user_id, code_hash, used_at), and a Flyway migration under R-03. LEAD owns schema.sql (R-02). The stack already carries the rest: spring-boot-starter-security, spring-boot-starter-data-redis for the five-minute pending token and the replay guard, and bucket4j-redis for the try limit. TOTP itself is HMAC-SHA1 over a time counter, short enough to write and explain, which the brief asks participants to be able to do."
 },
 {
  "role": "admin",
  "file": "account.html",
  "screen": "Admin profile",
  "text": "FR-102 · The seed script publishes one account per role with the credentials printed in the submitted documentation, so the admin password is public by design and a second step on top of it protects nothing real. Proposal: ship it working but OFF on the seeded admin so the demo signs in with a password alone, and let this screen show what turning it on looks like. Seeding it ON with a published secret is worse: the same as having no second factor while looking like it has one."
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
  "file": "customer.html",
  "screen": "Customer detail",
  "text": "FR-072 · Which customer details an admin may see is not specified, and this screen is where it matters most: it puts a home address, a full phone number and a purchase history on one page. The prototype shows them read-only and masks nothing. The team has to decide what an admin may see, what should be masked, whether the reading is logged, and whether an admin may edit or delete a customer at all. The same question is already flagged on the customers list."
 },
 {
  "role": "admin",
  "file": "customer.html",
  "screen": "Customer detail",
  "text": "FR-072 / D-09 · What happens to a deactivated customer's running orders is not decided. D-09 settles the same question for a suspended Farmer — running orders finish as normal — so the prototype applies that reasoning here, but nothing says it holds for a customer. A customer deactivated for repeated no-shows is exactly the case where letting the orders run is arguable. LEAD to confirm or reject."
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
  "file": "feedback.html",
  "screen": "Feedback inbox",
  "text": "FR-081 · The SRS asks for a feedback form with bug, suggestion and query, and stops there. Nothing says an admin answers, by what channel, within what time, or whether the person who wrote it ever sees a reply. The inbox and this answer box are a proposal: they need a new FR, a reply channel that actually exists (email is FR-043, a NICE), and a feedback table with a status and a response. The same gap is flagged on public/feedback.html from the customer side."
 },
 {
  "role": "admin",
  "file": "login.html",
  "screen": "Admin sign in",
  "text": "FR-004 / FR-007 · Resetting an admin password reuses the Customer reset flow here, which is a decision nobody has taken. FR-004 asks for an admin area separate from the Customer and Farmer view, and an admin can approve stalls, deactivate customers and change what the platform charges, so the same emailed link that resets a shopper is arguably not enough. Decide: share the flow, give the admin area its own reset, or require a second admin to do it. The feature catalog lists admin password recovery as a proposal, not an SRS requirement."
 },
 {
  "role": "admin",
  "file": "login.html",
  "screen": "Admin sign in",
  "text": "FR-004 / FR-007 · Resetting an admin password reuses the Customer reset flow here, which is a decision nobody has taken. FR-004 asks for an admin area separate from the Customer and Farmer view, and an admin can approve stalls, deactivate customers and change what the platform charges, so the same emailed link that resets a shopper is arguably not enough. The team has to decide: share the flow, give the admin area its own reset, or require a second admin to do it. The feature catalog lists admin password recovery as a proposal, not as an SRS requirement."
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
  "file": "moderation.html",
  "screen": "Moderation",
  "text": "D-13 / FR-005 · Hiding a control is not the control. An admin reading the public site now sees a reason instead of Add to cart and the hearts are disabled, but the server has to refuse as well: POST /orders, /cart, /reviews and /favorites must answer 403 for an admin JWT. Definition of Done item 3 says it in the team own words. Every buying control in the prototype carries data-buy or data-fav, so the exact set to refuse can be grepped."
 },
 {
  "role": "admin",
  "file": "moderation.html",
  "screen": "Moderation",
  "text": "D-13 · The smaller version of the same conflict is open: may a Farmer put their OWN product in their own cart? Today they can. Less serious than the admin case because a Farmer cannot approve or suspend anyone, but it still lets a stall place and complete an order against itself, moving its own revenue figures and unlocking a review of itself under D-10. LEAD to decide: allow, block, or allow but leave those orders out of the stall reports."
 },
 {
  "role": "admin",
  "file": "order.html",
  "screen": "Order detail (Admin)",
  "text": "FR-070 / D-04 · Whether an admin may ever intervene in an order is not decided. The case that forces it: a stall is suspended or simply stops answering while an order sits in placed past its cutoff, and nobody can move it. Today it would sit there until the FR-039 job sweeps ready orders, which never touches a placed one. Options are to let an admin cancel on the customer's behalf with a reason, to extend the auto-complete job to stale placed orders, or to accept that it stays stuck. Each needs a line in D-04 and an entry in order_status_history saying an admin did it."
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
 },
 {
  "role": "admin",
  "file": "verify.html",
  "screen": "Two-step verification",
  "text": "Out of scope · Two-step verification is not in the SRS. §1.7 asks only for \"adequate security measures such as authentication\", and FR-003 and FR-004 stop at a secure sign-in on a separate dashboard. The evaluation sheet scores Functionality against the SRS requirements, so this earns nothing there and a little under Source Code. It needs a new FR, an admin_mfa table and a Flyway migration under R-03. Build it after the MUSTs, not before."
 },
 {
  "role": "admin",
  "file": "verify.html",
  "screen": "Two-step verification",
  "text": "FR-102 · The seed script publishes one account per role with the credentials printed in the submitted documentation, so the admin password is public by design. Two-step verification on top of a published password protects nothing unless the TOTP secret is withheld too, and then nobody can sign in to mark the project. Proposal: implement it properly but leave it OFF on the seeded admin, and show the enrolment screen instead. LEAD to confirm."
 }
];
