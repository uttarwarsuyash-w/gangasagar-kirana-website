# Decisions

Defaults chosen instead of asking. Each one can be changed later.

## Build and hosting
- **Visual reference:** the screenshot attached to the brief shows lusion.co (glossy 3D objects, big grotesk type), not Constantin Dan's portfolio. I followed the written description in section 4 and used the Lusion screenshot only as a second mood reference.
- **GitHub:** the GitHub connector in this workspace is not allowed to create repositories (HTTP 403). The project is a local git repository with a commit per stage; it is also delivered as a zip. To push it, create an empty private repository and follow SETUP.md step 1.
- **Physics:** custom lightweight physics instead of Rapier. Rapier's WebAssembly build alone is about 700 KB gzipped, which would use the entire 3D budget. The pieces only need to fall, bounce, roll and pile up, which a small sphere solver does in a few KB.
- **Demo mode:** when the three Supabase keys are not set, the site runs on an in-browser copy of the real database (PGlite: the same SQL migrations, functions and security rules). This powers the preview link and lets you try ordering and the admin before creating accounts. It is loaded only on pages that need it.
- **Next.js 16 static export.** Pages that show one order or quotation use a query string (`/en/account/order/?id=...`) because a static site cannot pre-build pages for orders that do not exist yet.
- **Admin is English only.** The two admins read English; customer pages are English and Hindi.
- **Fonts:** Anek Latin (variable width and weight) for display, Anek Devanagari (weight axis only: the width-axis Devanagari file is 726 KB, the weight-only file 257 KB) for Hindi display, Mukta for text, Kalam for price tags and handwritten captions. Self-hosted, subset to Latin, Latin Extended and Devanagari.

## Catalogue
- The brief lists 170 products across 20 categories (it says "about 190"); I seeded exactly the listed items, nothing invented. 438 variants.
- Loose items have one "loose, per kg" variant; the scale's weight stones (500 g, 1 kg, 5 kg, 25 kg) set the amount on that variant. Packed, litre and piece items have one variant per pack.
- Shipping weights for litre and piece items (for the 2 kg / 20 kg rules) are estimates, editable per variant.
- Descriptions are short factual templates in both languages ("sold loose by weight...") with no health claims. Owners can rewrite them.

## Commerce
- Stock is reserved when an order is placed and returned when an order is cancelled.
- For prepaid (outside Nanded) orders, the admin can confirm the order but cannot move it to Processing until the payment is marked paid.
- Status changes only move forward (the admin may skip steps, e.g. store pickup straight to Delivered).
- In Nanded, a 20 kg+ cart can still check out at retail prices or request a wholesale price; outside Nanded, 20 kg+ must use a quotation (as the brief says).
- A wholesale quotation request needs at least 20 kg combined.
- Customers see Available / Limited stock / Out of stock only. Stock counts cannot be read from the browser at all (column-level permissions), not just hidden in the UI.
- Sales numbers on the dashboard and in reports exclude test orders (all orders placed in preview mode) and cancelled orders. Test orders are counted separately.

## Content
- Offers, blog and FAQ start with one unpublished example each, as asked. The FAQ page and help pop-up also show "quick answers" built from the store settings (hours, delivery fees, payment, wholesale threshold). These are the verified rules from the brief, not invented FAQs.
- "Read our Google reviews" and "Write a review" both point to the Google Maps link until an admin pastes the exact write-a-review link in Settings.
- Policy pages are written from the rules in the brief and marked "to be reviewed before launch" in the admin.
