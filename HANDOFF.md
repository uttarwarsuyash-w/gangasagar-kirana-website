# Handoff

Updated after every stage. Paste this file and the build prompt into a new chat with the word "continue" to resume.

## Status
- [x] Stage 1: brand (mark, lockup, icons), tokens, fonts, layout shell, header, footer, menus, search, cart drawer
- [x] Stage 2: 3D pour scene (custom physics, procedural snacks, tiers, posters/renders via scripts/posters.mjs)
- [x] Stage 3: database schema, security, business functions, seed catalogue, 55 database tests + 33 unit tests passing
- [x] Stage 4: home, shop, category, product (scale picker), search, cart, checkout, order confirmation, demo sign-in. End-to-end order tested in headless Chrome on the demo database.
- [x] Stage 6 (mostly): account tabs, order tracking route, invoices (PDF), reorder, wishlist, reviews, quotations, wholesale builder
- [x] Stage 7 (mostly): journey scroll story, leadership, gallery, offers, blog, FAQ + quick answers, help pop-up, contact, policies, Hindi
- [ ] Stage 5: admin panel  <- NEXT
- [ ] Stage 8-9: performance/a11y/SEO pass, nightly backup workflow, Edge Functions (notify, publish, submit-enquiry), Playwright tests, screenshots of every page, SETUP.md, ADMIN-GUIDE.md, final report

## How to run
```
npm install
npm run catalogue   # regenerates seed files from scripts/catalogue.py
npm test            # unit + database tests (PGlite, no accounts needed)
npm run dev         # http://localhost:3000/en/
npm run build       # static site in out/
```
