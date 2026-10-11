# Mercora

**AI-powered e-commerce operations.**

Mercora is an e-commerce operations application for managing orders, products, customers and inventory, with an integration to Cascade for refund consequence simulation.

---

## Key Features

**E-commerce Operations**
- Order management (create, view, ship, cancel)
- Product catalog with SKU, pricing and stock levels
- Customer profiles with lifetime value tracking
- Inventory management with reorder alerts
- Revenue and performance analytics

**Cascade Integration**
- Refund simulation endpoint (`POST /api/cascade/simulate-refund`)
- Displays consequence reports: blast radius, risk scores, policy decisions
- Direct refund endpoint disabled to enforce simulation workflow
- Simulation does not execute refunds or modify order state

---

## Technology Stack and Cascade Integration

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 15.0.0, React 19.0.0, TypeScript 5.3.0, Tailwind CSS 3.4.0 | E-commerce user interface |
| **Backend** | FastAPI 0.104.1, Python 3.11+, SQLAlchemy 2.0.23, PyJWT 2.9.0 | Commerce APIs and Cascade integration |
| **Database** | PostgreSQL (Neon) | Commerce data (orders, products, customers, inventory) |
| **Cascade** | External REST API | Refund consequence simulation |

**Integration flow:**
- Mercora backend sends refund simulation requests to Cascade REST API
- Cascade returns consequence report (blast radius, risk assessment, policy decision)
- Mercora displays the returned information in the operator UI
- Simulation is read-only; actual refund execution is not implemented

**Key dependencies:**
- Backend: httpx 0.27.2 (Cascade client), Pydantic 2.5.0, psycopg2-binary 2.9.9
- Frontend: Axios 1.6.0, Recharts 2.10.0, Lucide React 0.460.0

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.11+
- PostgreSQL 14+ or [Neon account](https://console.neon.tech)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd mercora

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Configuration

**Backend** - Create `backend/.env`:
```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<secure-password>

CASCADE_API_URL=https://cascade-api-1097302968574.asia-south1.run.app
CASCADE_DEMO_USER=ops-ravi
CASCADE_TIMEOUT_SECONDS=30.0
```

**Frontend** - Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

**Database:** Schema is created automatically on first startup via `Base.metadata.create_all()`.

**Sample data (optional):**
```bash
cd backend
python scripts/load_kaggle_data.py
```

### Running

**Backend:**
```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload
```
API: `http://localhost:8001` (docs at `/docs`)

**Frontend:**
```bash
cd frontend
npm run dev
```
Application: `http://localhost:3000`

**Login:** Use credentials from `backend/.env`

---

## Testing

**Backend integration tests:**
```bash
cd backend
python test_cascade_integration.py
```

Tests verify:
- Cascade health check
- Successful refund simulation
- Input validation
- Direct refund endpoint disabled (410 response)
- Simulation state immutability
- Authentication requirements

**Frontend validation:**
```bash
cd frontend
npm run type-check
npm run lint
npm run build
```

---

## Contributors

| Contributor | Focus | Profiles |
|-------------|-------|----------|
| **Sujan Kumar** | Product engineering, Cascade integration and implementation | [![GitHub](https://img.shields.io/badge/GitHub-KRYSTALM7-181717?logo=github)](https://github.com/KRYSTALM7) [![Google Developers](https://img.shields.io/badge/Google_Developers-CR1TIC4L-4285F4?logo=google&logoColor=white)](https://g.dev/CR1TIC4L) |
| **Ipjrb12** | Planning, system design, workflow design and architecture | [![GitHub](https://img.shields.io/badge/GitHub-ipjrb12-181717?logo=github)](https://github.com/ipjrb12) [![Google Developers](https://img.shields.io/badge/Google_Developers-ipshita12gdg-4285F4?logo=google&logoColor=white)](https://me.developers.google.com/u/ipshita12gdg) |

---

## Contributing

Contributions are welcome. Open an issue to discuss significant changes before starting work.

---

## License and Attribution

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Cascade:** Mercora integrates with Cascade, an external consequence intelligence engine that provides refund simulation capabilities via REST API.

**Neon:** Database hosting provided by [Neon](https://neon.tech).
