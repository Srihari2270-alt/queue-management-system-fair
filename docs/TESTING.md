# Verification

Verified October 27, 2026 using Node 22.23.4.

- `npm ci`: reproducible dependency installation with the included lockfile.
- `npm run build`: Angular production build completed, approximately 261 KB
  uncompressed initial JS + CSS. Run npm run build to create the compiled output locally.
- `npm test`: 11 backend integration tests passed against a temporary real
  MongoDB server. No Atlas credentials or paid services used.
- Browser flow checks against the production UI + Express API + MongoDB:
  customer registration, token booking, callback request, logout, admin login,
  calling the next priority token, resolving a callback, and loading daily reports.
- No uncaught browser JavaScript errors during those flows.
- Desktop 1440px and phone 390px/320px screenshots inspected. Live boards become
  labeled stacked rows on phones. No page-wide horizontal overflow in tested
  phone live-board/front-desk views.
- Preserved original QFlow colors, headers, cards and tab patterns.

## Automated backend coverage

1. Anonymous reads denied and cross-site writes rejected.
2. Customer creation, server password hashing and HttpOnly session cookie.
3. Duplicate account, weak inputs and wrong password rejected.
4. Customer privacy, role escalation prevention and duplicate active-token rule.
5. Ownership enforced on cancellations and state transition restrictions.
6. Priority call order, staff/admin separation and occupied-counter protection.
7. Concurrent calls receive different tokens/counters.
8. Callback persistence, privacy and staff-only completion.
9. Daily report/CSV permissions, reset confirmation and account preservation.
10. Invalid branch/service rejection.
11. Logout invalidates the session.

Screenshots used during verification show invented test accounts. `npm test` downloads a temporary MongoDB binary on first use and then
cleans up the temporary database. The normal app uses `database/config.js`,
not this test database. Live Atlas connectivity and a public HTTPS deployment
were not tested because no user's database or hosting account was provided.
