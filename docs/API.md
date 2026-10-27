# API reference

Base path: `/api`. JSON request and response bodies, except CSV export. All routes
except health/register/login/logout require the HttpOnly session cookie. Angular
uses same-origin requests through its dev proxy. No JWT or database password is
stored in browser localStorage. Errors are JSON `{ "message": "..." }`.

| Method | Path | Access | Request / result |
| --- | --- | --- | --- |
| GET | `/health` | Public | API/database status |
| POST | `/auth/register` | Public | `{username,password,name,phone}` → `{user}` + session cookie |
| POST | `/auth/login` | Public | `{username,password}` → `{user}` + session cookie |
| GET | `/auth/me` | Signed in | `{user}` safe account profile |
| POST | `/auth/logout` | Public, current session if any | Revokes session; clears cookie |
| GET | `/branches` | Signed in | `{branches,services}` |
| GET | `/queue?branch=SBT` | Signed in | Branch snapshot, own tokens and all-branch summaries; private fields removed for customers |
| POST | `/tokens` | Signed in | `{branch,service}` for customer; staff may add `{name,phone,priority,type}` → `{token}` |
| PATCH | `/tokens/:id/cancel` | Token owner | Cancel own waiting token |
| POST | `/queue/call-next` | Staff/admin | `{branch,counterId?,tokenId?}` → called `{token}` |
| PATCH | `/tokens/:id/status` | Staff/admin | `{status:"Completed"}` or `{status:"Skipped"}` |
| PATCH | `/counters/:id` | Admin | `{open:true}`; cannot close occupied counter |
| POST | `/callbacks` | Signed in | `{branch,name,phone,message}` → saved `{callback}` |
| PATCH | `/callbacks/:id` | Staff/admin | Mark callback done; empty JSON body |
| GET | `/reports?branch=SBT` | Staff/admin | Today's IST tokens, counts, date |
| GET | `/reports/export?branch=SBT` | Admin | Today's selected-branch CSV download |
| POST | `/admin/reset` | Admin | `{confirm:"RESET DEMO"}` resets all sample queues, not user accounts |

## Examples

Customer registration:
```json
{"username":"srihari_v","password":"replace-with-your-own-password","name":"Srihari V","phone":"9876543210"}
```

Book token (only after signing in):
```json
{"branch":"SBT","service":"Cash deposit / withdrawal"}
```

Staff issue token:
```json
{"branch":"APG","service":"Doctor consultation","name":"Example Customer","phone":"9876543210","priority":true,"type":"Walk-in"}
```

Call next on a particular counter:
```json
{"branch":"SBT","counterId":"SBT-C2"}
```

Registration always creates `customer`, even if someone sends a `role` field.
Password length is 8-128 characters; usernames are 4-20 letters, digits or
underscores and normalized to lowercase. Phone is 7-15 numeric/spacing/+/dash
characters. Request JSON is limited to 32 KB. Queue mutation bodies are validated;
there is no whole-state-write endpoint.

Token states: `Waiting → Serving → Completed`; staff may skip Waiting or Serving,
and an owner may cancel Waiting. Priority tokens sort first, then issue time.
Counter assignment uses any available open counter, preserving the prototype's
behavior; service-specific counter matching is not implemented.

The API uses a revision compare-and-swap on the queue document and retries write
conflicts, then returns 409 if busy. Capacity is capped at 5,000 total demo tokens
and 1,000 callbacks to bound the starter's single-document design. Admin demo
reset is destructive for all queue history and callbacks. Export before resetting.
This is not a daily auto-reset service; past queue records persist until reset.
Reports filter by today's Asia/Kolkata date while live queues retain active tokens
and history across dates.
