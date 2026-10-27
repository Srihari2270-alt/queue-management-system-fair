# QFlow - Angular + Node + MongoDB

A full-stack rebuild of the supplied QFlow HTML prototype. The navy/blue design,
Chennai branch list and customer/staff workflows are preserved. The browser no
longer owns the database, password checks or staff permissions.

## Start here

Install **Node.js 22.22.3 or newer supported LTS** and npm. The included Angular
22 release requires Node 22.22.3+, Node 24.15+ or Node 26+; an older Node 22 version
will not work. The project was built and tested with Node 22.23.4.

1. Extract the ZIP and open a terminal **inside the `qflow` folder**, next to this README.
2. Start a MongoDB server, using ONE of these options:
   - With Docker installed: `docker compose up -d mongo`
   - Or install MongoDB Community locally and start its database service.
   - Or use an Atlas **Free** cluster, then put its connection string in the environment file below.
3. Install dependencies at the project root:
   ```sh
   npm ci
   ```
4. Copy `backend/.env.example` to `backend/.env`:
   - Windows Command Prompt: `copy backend\.env.example backend\.env`
   - macOS / Linux: `cp backend/.env.example backend/.env`
5. The default local Mongo URL already works with the Docker option. If using Atlas,
   change **only `MONGO_URI`** in `backend/.env` to the URI from Atlas. Include the
   `qflow` database in the URI path, use a dedicated database user, percent-encode
   reserved characters in its password, and allow your IP in Atlas Network Access.
   Do not paste database passwords into source control or frontend code.
6. Optional, for local demonstration accounts:
   ```sh
   npm run seed:demo
   ```
7. Start both apps:
   ```sh
   npm run dev
   ```
8. Open **http://localhost:4200**. The Node API is on port 3000. Use the same
   `localhost` hostname in the browser as `APP_ORIGIN` in `backend/.env`.

No demo accounts are automatically created. Customers can register without the
seed command. A fresh database receives sample branches, counters and queue data.

### Optional demo sign-ins

Created only by `npm run seed:demo`; existing accounts are not overwritten:

| Portal | Username | Password |
| --- | --- | --- |
| Customer | `customer` | `customer123` |
| Staff | `staff` | `staff1234` |
| Admin | `admin` | `admin1234` |

These are public sample credentials. **Never seed these on a public deployment.**
Staff/admin users are not created through customer registration. For a real site,
replace this development seed with a private admin provisioning procedure.

## Single Mongo connection config

`backend/src/config.js` is the single connection-configuration file.
It reads `MONGO_URI` from `backend/.env` once. `backend/src/db.js` uses this
configuration to open the connection and define the models. No connection strings
appear in Angular, routes or individual models. `.env` is ignored by Git.

Local default:
```text
MONGO_URI=mongodb://127.0.0.1:27017/qflow
```

MongoDB Community is a local option without a cloud subscription. Atlas offers a
Free cluster suitable for small development projects; select **Free**, not Flex or
a paid cluster. You create that account yourself. No cloud account or deployment
has been created as part of this project.

Official setup references:
- https://www.mongodb.com/docs/manual/administration/install-community/
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/

## What works

### Customer
- Register, sign in, sign out, and recover a live session after refresh.
- Choose among the original ten Chennai bank/hospital sample branches.
- Overview of current counters, priority-sorted waiting list and estimated wait.
- Book a normal-priority token; only one active token per customer per branch.
- Track all own tokens across branches and cancel an own waiting token.
- View a privacy-filtered live board and compare branch waiting times.
- Send a callback request into the staff console and expand help answers.

### Staff
- View customer names only in authorised staff views.
- Issue walk-in/online-labelled tokens and mark priority customers.
- Call the next priority token or a selected waiting token into an available counter.
- Complete or skip a token, manage no-shows, and resolve callback requests.
- Read today's branch report in India time.

### Admin only
- Open or close unoccupied counters.
- Export today's selected-branch report as CSV.
- Reset all sample queues after confirmation; customer accounts are preserved.

The UI refreshes shared queues every **5 seconds** while the tab is visible,
with a manual refresh button. This is polling, not a WebSocket push service.
Actions update immediately after the API returns. Phone screens use stacked table
rows instead of making essential data horizontally scroll. Busy states, keyboard
focus indicators, form labels, validation and error messages are included.

## Password and session safety

MongoDB stores **username + salted scrypt password hash**, never readable passwords.
The API never returns a password hash. Sessions use random tokens in HttpOnly,
SameSite=Lax cookies; only their SHA-256 digests are stored in MongoDB. Sessions
expire after eight hours, and logout revokes the session. Authorization is checked
on every API request, not merely hidden behind a frontend button.

Other safeguards include input validation, rate limits, secure response headers,
cross-site mutation checks, token ownership checks, private queue projections,
CSV formula escaping, and revision-checked atomic queue updates to avoid two
requests overwriting each other or calling the same counter simultaneously.

This is a working educational starter, **not a production security certification**.
Before collecting real personal data: use HTTPS, secure authenticated MongoDB,
replace all demo credentials, restrict staff to their assigned branches, add
password recovery/verification, monitoring, backups, privacy retention rules and
an audit trail. Staff currently have access to every sample branch. The queue is
stored as one revisioned document for simple, small-scale deployment, not as a
high-volume enterprise queue architecture.

## Build and run from one server

For a local built version:
```sh
npm run build
npm start
```
Open **http://localhost:3000**. Node serves both Angular's compiled files and `/api`.
There is no need to run `npm run dev` at the same time. The ZIP includes the tested
compiled frontend under `frontend/dist/qflow/browser`; rebuild after editing it.

For a real HTTPS deployment, set `NODE_ENV=production` and `APP_ORIGIN` to your
actual HTTPS origin in `backend/.env`. Secure cookies require HTTPS in production.
Keep the API and Angular on the same public origin. Configure reverse-proxy TLS,
trusted proxy behavior and infrastructure limits deliberately before deployment.
The included Docker Mongo config binds only to localhost and is for local use;
do not expose its unauthenticated database port to a network.

## Tests

```sh
npm test
npm run build
```
The backend tests use a temporary real MongoDB process via `mongodb-memory-server`;
they do not touch the configured app database. The first run downloads a MongoDB
binary and needs internet access. Tested: auth, hashed passwords, validation,
role/ownership restrictions, queue privacy, priority ordering, concurrent calls,
counter transitions, callbacks, reports, reset and logout. See `docs/TESTING.md`.

## Folder map

```text
qflow/
  README.md
  package.json + package-lock.json   # one install for both workspaces
  docker-compose.yml                # optional local MongoDB
  backend/
    .env.example                    # copy to .env (do not commit secrets)
    src/config.js                   # single Mongo connection configuration
    src/db.js                       # Mongoose user/session/queue models
    src/auth.js                     # password hashing, sessions, role middleware
    src/data.js                     # sample branches/services/initial queues
    src/queue.js                    # queue rules and compare-and-swap updates
    src/app.js                      # Express API and compiled UI serving
    src/server.js                   # connection + startup
    src/seed.js                     # optional local demo accounts
    test/api.test.js
  frontend/
    angular.json, tsconfig.json, proxy.conf.json
    src/app/api.service.ts          # typed API client
    src/app/app.component.ts        # Angular UI state/actions
    src/app/app.component.html      # Angular templates, no inline handlers
    src/styles.css                  # preserved design + responsive layouts
    dist/qflow/browser/             # tested production build
  docs/API.md
  docs/ANALYSIS.md
  docs/TESTING.md
  docs/screenshots/
```

## Troubleshooting

- **Startup failed / database unreachable:** start MongoDB, check `MONGO_URI`, or
  check the Atlas database credentials and allowed IP. MongoDB Compass alone is
  a database viewer, not the local MongoDB server.
- **Origin not allowed:** use `http://localhost:4200` in development, or make
  `APP_ORIGIN` match the browser URL exactly and restart the backend.
- **Port already in use:** stop a prior dev process. If changing the API port,
  update `PORT` and `frontend/proxy.conf.json` together.
- **Missing demo login:** run the optional seed after configuring MongoDB.
- **New source changes do not appear with `npm start`:** run `npm run build` again.
- **Rate limit:** wait for its response window; auth is limited to 30 attempts
  per 15 minutes per IP and other API requests to 240 per minute per IP.
- **Offline:** the app shows disconnection and does not pretend to save locally.

Branch names, phone numbers and seeded queue data are **illustrative**. The old
prototype's fake phone links are intentionally disabled. A callback creates a
stored request; it does not send SMS, email or place a call. No real institution
is integrated. Waits are estimates, not appointment guarantees. No payments exist.
