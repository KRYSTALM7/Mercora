<p align="center">
  <img src="docs/assets/logo.png" width="120" alt="Cascade logo used by Mercora" />
</p>

<h1 align="center">Mercora</h1>

<p align="center"><strong>See what an AI action will set in motion before it happens.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Google_AI-Builder_Cup_2026-4285F4?style=flat-square&logo=google" alt="Google AI Builder Cup 2026" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-0.104.1-009688?style=flat-square&logo=fastapi" alt="FastAPI 0.104.1" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=flat-square&logo=googlecloud" alt="Google Cloud Run" />
  <a href="https://github.com/KRYSTALM7/cascade"><img src="https://img.shields.io/badge/Engine-Cascade-7C3AED?style=flat-square" alt="Cascade consequence intelligence engine" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="#why-mercora">Why</a> · <a href="#key-features">Features</a> · <a href="#demo">Demo</a> · <a href="#how-it-works">Architecture</a> · <a href="#getting-started">Quick Start</a> · <a href="#team">Team</a>
</p>

Mercora is a demo e-commerce operations app for orders, products, customers, and inventory. Its refund flow connects the operator experience to [Cascade](https://github.com/KRYSTALM7/cascade), a consequence-intelligence engine.

## Demo

▶ **[Watch the demo video](https://drive.google.com/file/d/1sN-F9TT0Ke0mTdZJRb-CoeltACRN_oip/view?usp=sharing)**

**Live sites:**
- **Mercora (frontend):** https://demo-polish-web---mercora-web-gp5ciyqy6a-el.a.run.app/dashboard
- **Cascade API (consequence engine backend):** https://cascade-api-1097302968574.asia-south1.run.app
- **Cascade engine (backend of the consequence simulation):** https://github.com/KRYSTALM7/cascade

## Why Mercora?

Operators using AI agents to cancel, refund, or edit orders often cannot see what an action will trigger downstream. **Cascade is the engine; Mercora is the real-world surface.** A refund starts as a button in a familiar operations app, showing the integration working inside a product rather than only inside Cascade's own UI.

Refunds are a useful first case: money moves, the action can be partly irreversible, and it can involve finance, CRM, and inventory agents. Cascade maps those consequences before a human decides. The simulation is read-only: it does not execute the refund or change Mercora order data. The direct refund endpoint returns **410 Gone** so a refund cannot bypass the simulate-before-act flow. Refund execution itself is not implemented.

| Without Cascade | With Mercora + Cascade |
|---|---|
| An operator sees the requested refund. | The operator sees a consequence report before deciding. |
| Downstream agent actions are difficult to anticipate. | Blast radius, risk, and policy decision are visible together. |
| A refund can look like one isolated action. | The simulation shows it as a connected set of consequences. |

## Key Features

**E-commerce Operations**

- Dashboard, orders, products, customers, inventory, and analytics.
- Review order details, manage catalog and stock, and track customer value.
- Administrator-managed access; evaluators have a read-only role.

**Cascade Integration**

- Simulate refunds for the demo orders mapped to Cascade.
- Review blast radius, risk factors, and policy decisions in the order workflow.
- Run a built-in Cascade demo scenario. Simulations do not execute operations.



## How It Works

The operator starts a simulation from an order. Mercora's API sends a scoped request to Cascade and returns its consequence report to the UI.

```mermaid
sequenceDiagram
    actor Operator
    participant UI as Mercora UI
    participant API as Mercora API
    participant Cascade as Cascade API
    Operator->>UI: Choose simulate refund
    UI->>API: POST /api/cascade/simulate-refund
    API->>Cascade: POST /api/actions/simulate
    Cascade-->>API: Consequence report
    API-->>UI: Blast radius, risk, decision
    UI-->>Operator: Review before deciding
```

The simulation is read-only: it checks that the order is unchanged and does not call a refund execution API. The direct `POST /api/orders/{order_id}/refund` endpoint is disabled and returns **410 Gone**. Only orders in the configured demo mapping can be simulated.

## Screenshots

| Sign in and dashboard | Orders and refund flow |
|---|---|
| <p align="center"><img src="docs/assets/screenshots/01-login.png" width="420" alt="Mercora sign-in screen" /><br /><em>Sign in or request access.</em></p> | <p align="center"><img src="docs/assets/screenshots/02-dashboard.png" width="420" alt="Mercora operations dashboard" /><br /><em>Business and inventory overview.</em></p> |
| <p align="center"><img src="docs/assets/screenshots/03-orders.png" width="420" alt="Mercora orders list" /><br /><em>Choose an eligible demo order.</em></p> | <p align="center"><img src="docs/assets/screenshots/04-order-detail-refund.png" width="420" alt="Mercora order detail with refund simulation action" /><br /><em>Start a refund simulation from an order.</em></p> |
| <p align="center"><img src="docs/assets/screenshots/05-cascade-simulation-result.png" width="420" alt="Cascade refund simulation result with blast radius, risk, and decision" /><br /><em>Review consequences before deciding.</em></p> | <p align="center"><img src="docs/assets/screenshots/06-products-inventory.png" width="420" alt="Mercora products and inventory screens" /><br /><em>Manage products and stock.</em></p> |
| <p align="center"><img src="docs/assets/screenshots/07-customers.png" width="420" alt="Mercora customer profiles" /><br /><em>Review customer profiles and lifetime value.</em></p> | <p align="center"><img src="docs/assets/architecture-overview.png" width="420" alt="Mercora and Cascade architecture overview" /><br /><em>Mercora calls Cascade for consequence simulation.</em></p> |

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS | Operator interface |
| Backend | FastAPI, Python 3.11+, SQLAlchemy | Commerce API and Cascade client |
| Database | PostgreSQL | Users and commerce records |
| Deployment | Google Cloud Run | API and web services; see the [deployment guide](docs/DEPLOY_CLOUD_RUN.md) |
| Consequence engine | [Cascade REST API](https://github.com/KRYSTALM7/cascade) | Refund consequence simulation |

<details>
<summary><b>Key dependencies and versions</b></summary>

Frontend versions below are the project-declared versions from `package.json`; the backend versions are pinned in `backend/requirements.txt`.

| Area | Dependencies |
|---|---|
| Frontend | Next.js `^15.0.0`, React / React DOM `^19.0.0`, TypeScript `^5.3.0`, Tailwind CSS `^3.4.0`, Axios `^1.6.0`, Recharts `^2.10.0`, date-fns `^2.30.0`, lucide-react `^0.460.0`; dev: `@types/node` `^20.0.0`, `@types/react` / `@types/react-dom` `^19.0.0`, PostCSS `^8.4.0`, Autoprefixer `^10.4.0`, ESLint `^8.54.0`, eslint-config-next `^15.0.0` |
| Backend | FastAPI `0.104.1`, Uvicorn `0.24.0`, SQLAlchemy `2.0.23`, psycopg2-binary `2.9.9`, Pydantic `2.5.0`, pydantic-settings `2.1.0`, python-dotenv `1.0.0`, httpx `0.27.2`, PyJWT `2.9.0` |

</details>

## Getting Started

**Prerequisites:** Node.js 18+, Python 3.11+, and PostgreSQL 14+. Run Cascade separately if you want live consequence reports.

### Install

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install
```

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Set-Location frontend
npm install
```

### Configure

Create `backend/.env` and `frontend/.env.local`. Keep real credentials out of source control. The frontend API URL is embedded at build time for production builds.

<details>
<summary><b>Environment variables</b></summary>

Backend `backend/.env` (example-only values):

```dotenv
API_TITLE=Mercora API
API_VERSION=1.0.0
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
SECRET_KEY=replace-with-a-long-random-value
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=replace-with-a-strong-secret
EVALUATOR_EMAIL=evaluator@example.test
EVALUATOR_PASSWORD=replace-with-a-demo-password
CASCADE_API_URL=http://localhost:8000
CASCADE_DEMO_USER=demo-operator
CASCADE_TIMEOUT_SECONDS=30
```

Frontend `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8001
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are used only by the one-time bootstrap command. Never use example values in a shared environment. Optional frontend settings include `NEXT_PUBLIC_EVALUATOR_EMAIL`, `NEXT_PUBLIC_EVALUATOR_PASSWORD`, `NEXT_PUBLIC_APP_NAME`, and `NEXT_PUBLIC_APP_VERSION`; values prefixed with `NEXT_PUBLIC_` are public in the browser bundle and must never contain secrets.

</details>

### Run locally

Start the backend from the repository root:

```bash
uvicorn backend.app:app --host 127.0.0.1 --port 8001 --reload
```

PowerShell equivalent:

```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8001 --reload
```

Then start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. The API docs are served at `/docs` on the backend. Database tables are created at startup; an administrator account must be provisioned separately.

<details>
<summary><b>First-time administrator and access flow</b></summary>

Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in `backend/.env`, then run once from the repository root:

```bash
python -m backend.scripts.bootstrap_admin
```

PowerShell:

```powershell
python -m backend.scripts.bootstrap_admin
```

The command is idempotent: it creates the admin if absent and leaves an existing admin password unchanged. Normal API startup does not create an administrator. In the deployed setup, the one-off bootstrap is run as described in [the Cloud Run guide](docs/DEPLOY_CLOUD_RUN.md).

Staff can submit **Request access**. An administrator reviews requests through the admin-only API and approves them; the generated temporary password is returned only to that administrator for secure delivery. Password reset is unavailable; users must contact their administrator.

**Sample data warning:** `backend/scripts/load_kaggle_data.py` inserts synthetic products, customers, orders, and order items. It is not part of normal setup. Run it only against a disposable database, never a working Mercora dataset.

</details>

## Deployment

The repository includes a Cloud Run staging and release runbook: [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md). Review its environment and target details carefully before using it.

## Testing

The legacy `backend/test_cascade_integration.py` script mutates fixture data and order statuses. Run it only against a dedicated disposable test database, never a working Mercora database. The sample-data loader is also for disposable databases only.

<details>
<summary><b>Safe checks and test commands</b></summary>

Non-mutating backend smoke check:

```powershell
.venv\Scripts\python.exe test_backend.py
```

Frontend tests and validation:

```bash
cd frontend
npm test
npm run type-check
npm run lint
npm run build
```

The backend unit tests use the project's unittest setup; for example:

```bash
python -m unittest backend.test_auth backend.test_config backend.test_evaluator_demo
```

</details>

## Project Structure

<details>
<summary><b>Repository map</b></summary>

```text
backend/                 FastAPI app, routers, models, services, scripts, and tests
  routers/               Auth, commerce, analytics, and Cascade routes
  services/              Order, product, customer, inventory, and analytics logic
  scripts/                Admin bootstrap and data utilities
frontend/src/app/        Next.js pages and global styles
frontend/src/components/ Shared layout, UI, and Cascade result components
frontend/src/context/    Authentication state
frontend/src/lib/        API client and display helpers
docs/                    Deployment guide, screenshots, and README assets
```

</details>

## Team

| Contributor | Focus | Profiles |
|---|---|---|
| **Sujan Kumar** | Product engineering, Cascade integration and implementation | [![GitHub](https://img.shields.io/badge/GitHub-KRYSTALM7-181717?logo=github)](https://github.com/KRYSTALM7) [![Google Developers](https://img.shields.io/badge/Google_Developers-CR1TIC4L-4285F4?logo=google&logoColor=white)](https://g.dev/CR1TIC4L) |
| **Ipjrb12** | Planning, system design, workflow design and architecture | [![GitHub](https://img.shields.io/badge/GitHub-ipjrb12-181717?logo=github)](https://github.com/ipjrb12) [![Google Developers](https://img.shields.io/badge/Google_Developers-ipshita12gdg-4285F4?logo=google&logoColor=white)](https://me.developers.google.com/u/ipshita12gdg) |

## License and Attribution

Mercora is released under the [MIT License](LICENSE). Mercora's refund consequence simulation is powered by [Cascade](https://github.com/KRYSTALM7/cascade). PostgreSQL hosting is configured separately; see the [Cloud Run deployment guide](docs/DEPLOY_CLOUD_RUN.md).

<p align="center"><strong>Built for Google AI Builder Cup 2026</strong></p>
