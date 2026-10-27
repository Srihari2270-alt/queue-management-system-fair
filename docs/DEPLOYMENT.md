# Docker and internet deployment

## One-command local run with Docker Desktop

Start Docker Desktop, then open Command Prompt in the project folder and run:

```sh
docker compose up --build -d
```

Open http://localhost:8080. Docker builds Angular, starts Node and a private MongoDB
container, and stores database records in a persistent Docker volume. No separate
Node or MongoDB installation is needed for this route. The first build downloads
dependencies and images. Do not close Docker Desktop while using the app.

Register a customer normally. Optional local demo staff/admin accounts:

```sh
docker compose exec app node database/seed.js
```

Use `docker compose logs -f app` for startup errors. Stop with `docker compose down`.
Start again with `docker compose up -d`. `docker compose down -v` also deletes the
database, so do not use `-v` unless you intend to erase all local records.

The container defaults to production; Compose overrides it for local HTTP only so
session cookies work at localhost. Production internet deployments require HTTPS.
The database container has no exposed host port. This is local/demo infrastructure,
not a hardened public Mongo deployment. Local Docker builds were not executed in
the creation environment because a Docker engine was not available there.

## Public URL: recommended architecture

A free Node web service can host both the compiled Angular frontend and `/api` on
one HTTPS origin, with MongoDB Atlas Free holding data. This matches the current
HttpOnly session-cookie design and avoids browsers blocking third-party cookies.
Use the Dockerfile at repository root, set `MONGO_URI` as a secret in the host,
and set `APP_ORIGIN` to the host's actual HTTPS URL. Use `NODE_ENV=production`.
Do not put database credentials in GitHub source or frontend configuration.

Do not run `seed:demo` on a publicly reachable service. Its published sample
passwords would give anyone staff/admin access. Real staff provisioning and
password management must be set up separately before a public queue demo.

## GitHub Pages + Render (split-host mode)

The owner approved making this source repository public. Pages hosts Angular only;
Render hosts Node and Atlas holds the database. Pages cannot run Docker or APIs.

Set Render environment variables:

- `NODE_ENV=production`
- `SESSION_TRANSPORT=bearer`
- `APP_ORIGIN=https://srihari2270-alt.github.io`
- `TRUST_PROXY=1` (Render's single managed reverse proxy)
- `MONGO_URI` from Atlas, as a secret, never in source

In GitHub repository Settings > Secrets and variables > Actions > Variables, set
`QFLOW_API_BASE` to the deployed Render HTTPS origin, with no trailing slash/path.
Select GitHub Actions as the Pages source. The workflow requires this variable
before publishing, rather than shipping a page pointing at a nonexistent API.

Split hosting uses random eight-hour bearer sessions in browser `sessionStorage`,
not cross-site cookies. Refreshing preserves the current tab's login; closing the
tab ends its stored login. Logout revokes the server session. CORS accepts only the
configured GitHub Pages origin. Tokens are sent in Authorization headers, never URL
parameters. As with any JavaScript-accessible token, an XSS flaw could expose the
session; avoid third-party scripts and do not collect real personal data for this
educational demo. Default localhost/same-origin mode retains HttpOnly cookies.

For staff/admin, register your own account with a private password in the app.
Then, from an owner-controlled host shell with MONGO_URI configured, run:

```sh
node database/set-role.js YOUR_USERNAME admin
node database/set-role.js STAFF_USERNAME staff
```

This promotes an existing account without handling its password. Never post the
password in chat. Production mode rejects the demo seed command. Free Render shell
availability varies; if unavailable, the role can be changed by the owner through
Atlas Data Explorer or a private local connection to Atlas. Check the exact username
before promotion. No public registration route can choose staff/admin access.

## Free host caveats

Render Free web services sleep after 15 minutes without inbound traffic; a new
request can take about one minute to wake them. Included usage is limited. Do not
add a payment card or select paid instances for this project. Atlas Free is meant
for small development use. Hosting and database signup/verification still need the
owner's account choices. No cloud deployment is implied by these configuration files.

Sources checked October 27, 2026:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://render.com/docs/free
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
