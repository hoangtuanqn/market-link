window.PT_TODOS = [
 {
  "role": "public",
  "file": "about.html",
  "screen": "About us",
  "text": "FR-082 · Team names, roles and photos are not in the repo. Replace the placeholder tiles with the real team (the SRS requires information about the team)."
 },
 {
  "role": "public",
  "file": "about.html",
  "screen": "About us",
  "text": "SRS 1.6 · All AI tools used must be acknowledged in the documentation. List them here and in the ReadMe."
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
  "text": "FR-007 · Token lifetime (30 minutes here) and the email sender are not decided; FR-043 real email is NICE, so the reset email needs its own decision."
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
  "file": "dashboard.html",
  "screen": "Customer dashboard",
  "text": "SRS 1.6 · 'Customers … securely access their dashboard': the SRS names a customer dashboard but does not list what is on it. Prototype shows next pickups, counts and favorites; confirm the content."
 },
 {
  "role": "customer",
  "file": "favorites.html",
  "screen": "Favorites and saved markets",
  "text": "FR-014 (SHOULD) · 'route-friendly pickup details' is not defined beyond directions. Prototype: preferred markets sort first and directions start from the saved address."
 },
 {
  "role": "customer",
  "file": "review.html",
  "screen": "Review stall and products",
  "text": "FR-050/051 · Whether a customer can edit or delete a published review, and whether photos are allowed, is not specified."
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
  "file": "slots.html",
  "screen": "Pickup slots",
  "text": "FR-067 · Cancelling a whole market day or session (holiday, rain) is marked (proposal) in the feature catalog and not in the SRS; what happens to placed orders then is undecided."
 },
 {
  "role": "farmer",
  "file": "stock-week.html",
  "screen": "This week's stock",
  "text": "FR-063 · Whether the template carries a per-day price (the API contract has default_price) or only quantities, and whether applying it overwrites manual edits for the week, needs a decision."
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
  "text": "FR-071 · The checklist an admin follows before approving (call the contact number, confirm with the market operator, anything else) is not defined."
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
  "file": "markets.html",
  "screen": "Markets",
  "text": "FR-073 · Market holidays or one-off closures (like Thảo Điền on 04/10) are handled today by an announcement. A closure date on the market itself is marked (proposal) in the feature catalog."
 },
 {
  "role": "admin",
  "file": "moderation.html",
  "screen": "Moderation",
  "text": "FR-074 · The platform guidelines that define 'inappropriate' (advertising, off-platform contact, abuse…) are not written yet. Moderation reasons in the prototype are examples."
 },
 {
  "role": "admin",
  "file": "reports.html",
  "screen": "Reports",
  "text": "FR-075 · The SRS names three reports (total orders, revenue across markets, most active Farmers) but not the date ranges, whether 'active' means orders or products, or whether reports can be exported. The SRS example schema has a Reports table with generated_by and report_type; whether reports are stored or computed live is undecided."
 }
];
