# Analysis of the supplied HTML

The input was a 35 KB self-contained page with inline CSS and JavaScript. It
included home/portal selection, customer and staff login, customer registration,
queue overview, token booking/tracking, live board, ten Chennai branches, front
desk callbacks, staff token issue/calling/skipping/completion, counters and reports.

Its navy headers, blue active tabs, rounded white cards, statistics tiles,
priority/status chips and responsive grids form the visual basis of this rebuild.

## What needed to change

- The original stored account hashes and shared queue state in browser-managed
  state, optionally POSTing a whole state object to `/api/state`.
- A custom non-cryptographic password hash ran in client JavaScript.
- Admin/staff passwords and role checks were embedded in frontend code. Editing
  browser state could bypass UI restrictions; these are not secure permissions.
- DOM rendering and string-based inline event handlers coupled all UI behavior
  into one file. Some important form inputs relied only on placeholders.
- Phones and queue data were simulated, even though institutions had real names.

## Rebuild decisions

- Actual standalone Angular components/templates and a typed HTTP service. No
  wrapper iframe or embedded legacy script.
- Express JSON endpoints, Mongoose collections for users, expiring sessions and
  persistent queue state. No browser-only fallback that falsely claims a save.
- Server-side salted scrypt password hashing and opaque HttpOnly sessions.
- Customer ownership and staff/admin permissions enforced at each API endpoint.
- Atomic, revision-checked queue mutations instead of accepting full client state.
- Public/customer queue views strip other customers' names, phones and usernames.
- Callback requests persist in MongoDB and can be marked complete by staff.
- CSV export and counter controls remain admin-only. Daily reports use India time.
- Labels, keyboard focus, request errors, busy states, polling status and
  phone-width stacked table rows improve interaction and readability.
- The sample phone numbers are visible as examples but not dialable. The original
  fake call links would not reach a real front desk.
- Demo accounts are optional seed data, not hard-coded authentication logic.
- Reset preserves user accounts, unlike the original prototype's reset behavior.

The result is a local-ready, small-scale full-stack starter. It is not connected
to banks/hospitals or automatically deployed to a cloud service.
