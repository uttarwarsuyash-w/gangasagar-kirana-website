# Handoff

Updated after every stage. Paste this file and the build prompt into a new chat with the word "continue" to resume.

## Status
- [x] Stage 3 (pulled forward): database schema, security, business functions, seed catalogue, 55 database tests + 28 unit tests passing
- [ ] Stage 1: brand and design system (in progress)
- [ ] Stage 2: 3D pour scene
- [ ] Stage 4: shop
- [ ] Stage 5: admin
- [ ] Stage 6: accounts and wholesale
- [ ] Stage 7: story and content
- [ ] Stage 8-9: finish, test, review

## How to run
```
npm install
npm run catalogue   # regenerates seed files from scripts/catalogue.py
npm test            # unit + database tests (PGlite, no accounts needed)
npm run dev         # http://localhost:3000/en/
npm run build       # static site in out/
```
