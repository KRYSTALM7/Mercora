# Mercora Demo Guide

**End-to-end voice-driven order workflow with Cascade consequence intelligence**

---

## Quick Start

### 1. Start Backend
```powershell
cd backend
..\. venv\Scripts\Activate.ps1
uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Start Frontend
```powershell
cd frontend
npm run dev
```

### 3. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## Demo Data

### Seeding Data
The demo uses an idempotent seed script that safely loads data without duplication:

```powershell
cd backend
python scripts/seed_demo_data.py
```

**Safe to run multiple times** - will not create duplicates.

### Dataset Summary
- **Products:** 15 items (Electronics, Clothing, Home, Sports)
- **Customers:** 8 demo customers (VIP, Premium, Standard segments)
- **Orders:** 20 demo orders (ORD-DEMO-001 through ORD-DEMO-020)
- **Inventory:** 15 items (2 low stock alerts)
- **Suppliers:** 3 suppliers

### Flagship Demo Orders
These orders are mapped to Cascade's NovaCart domain for simulation:

| Mercora ID | Order Number   | Amount      | Status    | Customer       | Cascade Scenario |
|------------|----------------|-------------|-----------|----------------|------------------|
| **21**     | ORD-DEMO-001   | ₹97,500     | completed | Rajesh Kumar   | High-value VIP (HERO) |
| 22         | ORD-DEMO-002   | ₹2,798      | completed | Kavya Iyer     | Low-value auto-approve |
| 23         | ORD-DEMO-003   | ₹19,798     | completed | Amit Patel     | Medium-value standard |
| 25         | ORD-DEMO-005   | ₹55,000     | shipped   | Sneha Desai    | Shipped notification |
| 27         | ORD-DEMO-007   | ₹15,000     | completed | Rohan Mehta    | Partial refund |
| 30         | ORD-DEMO-010   | ₹103,000    | completed | Ananya Reddy   | High-value concurrency |
| 35         | ORD-DEMO-015   | ₹3,097      | completed | Rohan Mehta    | Low-value delivered |
| 40         | ORD-DEMO-020   | ₹55,000     | completed | Sneha Desai    | Standard clarification |

**Recommended Hero Order: ID 21 (ORD-DEMO-001)** - High-value VIP order with laptop + headphones

---

## Voice-Driven Demo Workflow

### Prerequisites
1. Set `GEMINI_API_KEY` in `backend/.env`:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_from_ai.google.dev
   ```
2. Ensure microphone access is granted in browser

### Step-by-Step Demo

#### 1. Login
- Open http://localhost:3000/login
- Use credentials from `backend/.env`:
  - Email: `admin@yourcompany.com` (or value of `ADMIN_EMAIL`)
  - Password: `your_password` (value of `ADMIN_PASSWORD`)

#### 2. View Populated Dashboard
- Dashboard shows real metrics from seeded data:
  - Total sales from all orders
  - Order counts by status
  - Product inventory
  - Low stock alerts (Jacket, Bottle)
- **Verify:** Dashboard loads without empty states

#### 3. Navigate to Orders
- Click "Orders" in sidebar
- **Verify:** List shows all 20 demo orders with accurate data
- **Verify:** Order ID 21 (ORD-DEMO-001) is visible with ₹97,500 total

#### 4. Select Demo Order
- Locate order ID 21: **ORD-DEMO-001** (₹97,500, Rajesh Kumar, completed)
- Note the microphone icon (🎤) next to the order

#### 5. Voice Input
- Click the microphone icon
- Voice input modal opens showing order details
- Click the microphone button in the modal
- **Speak clearly:** "Please issue a partial refund of three thousand rupees for this order"
- Click the microphone again to stop recording

#### 6. Review Transcript
- **Verify:** Transcribed text appears in the modal
- Review and edit if needed
- Click **"Confirm & Simulate"**

#### 7. Cascade Simulation
- Cascade simulation modal appears
- **Verify the following displays:**
  - **Status:** SIMULATED badge (no actual change)
  - **Proposed Action:** customer-support → request_refund with parameters
  - **Blast Radius:** Money out, agent count, downstream actions, records affected
  - **Risk Score:** Weighted total with dimension breakdown
  - **Policy Decision:** AUTO_APPROVED / APPROVAL_REQUIRED / BLOCKED
  - **Consequence Graph:** Downstream actions triggered (e.g., Finance → issue_refund)
  - **Explanation:** Human-readable summary with bullets

#### 8. Verify Safety
- Close the simulation modal
- **Verify:** Order status remains "completed"
- **Verify:** Order total remains ₹97,500
- **Simulation does NOT execute the refund**

---

## Alternative Demo Scenarios

### Scenario 1: Low-Value Auto-Approve
- **Order:** ID 22 (ORD-DEMO-002, ₹2,798)
- **Voice:** "Refund this order, customer returned the item"
- **Expected:** AUTO_APPROVED decision (under threshold)

### Scenario 2: Shipped Order Notification
- **Order:** ID 25 (ORD-DEMO-005, ₹55,000, shipped)
- **Voice:** "Issue a full refund for order issues"
- **Expected:** Notification to logistics for return coordination

### Scenario 3: High-Value Approval Required
- **Order:** ID 30 (ORD-DEMO-010, ₹103,000)
- **Voice:** "Process a refund of fifty thousand rupees"
- **Expected:** APPROVAL_REQUIRED with high risk score

### Scenario 4: Typed Input (No Voice)
- Click the lightning bolt icon (⚡) instead of microphone
- Directly triggers simulation without voice transcription
- Useful if Gemini is not configured or for quick testing

---

## Testing Without Gemini

If you don't have a Gemini API key:

1. Voice icon will show as disabled (🎤🚫)
2. Use typed input: edit the transcript textarea manually
3. Use direct simulation: click ⚡ icon instead of 🎤 icon
4. Typed workflow: Type → Confirm → Simulate → Review consequences

All Cascade simulation features work without voice transcription.

---

## Key Safety Mechanisms

### 1. Simulation Does Not Execute
- Cascade simulation is read-only
- Database state is verified unchanged after simulation
- Order record is never mutated during simulation

### 2. Voice is Not Authorization
- Transcript must be confirmed by user
- Confirmation only submits the request for evaluation
- Policy engine evaluates risk independently

### 3. Demo Order Mapping
- Only 8 mapped orders can be simulated
- Unmapped orders return clear error with available IDs
- Prevents accidental simulation on wrong data

### 4. Existing Authorization Flow
- Cascade evaluates policy rules
- High-risk actions require approval
- Blocked actions cannot proceed
- Stale state checks prevent race conditions

### 5. Audit Trail
- All simulation requests are logged
- Cascade tracks action history
- Frontend displays full consequence analysis

---

## Troubleshooting

### Empty Dashboard
**Problem:** Dashboard shows zero metrics  
**Solution:** Run seed script: `python backend/scripts/seed_demo_data.py`

### Voice Icon Disabled
**Problem:** Microphone icon is grayed out  
**Solution:** Set `GEMINI_API_KEY` in `backend/.env` and restart backend

### "Order not in demo scope"
**Problem:** Simulation fails with mapping error  
**Solution:** Only use orders with IDs: 21, 22, 23, 25, 27, 30, 35, 40

### Cascade Simulation Timeout
**Problem:** Request times out after 30 seconds  
**Solution:** Check Cascade API availability at: https://cascade-api-1097302968574.asia-south1.run.app

### Microphone Permission Denied
**Problem:** Browser blocks microphone access  
**Solution:** Grant microphone permission in browser settings

### Transcription Failed
**Problem:** Gemini returns error or empty transcript  
**Solution:** 
- Check audio is clear and not silent
- Verify GEMINI_API_KEY is valid
- Use typed input as fallback

---

## Database Reset (If Needed)

**Warning:** This will delete all data. Use only for fresh start.

```sql
-- Connect to your Neon database
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM suppliers;
DELETE FROM recommendations;
```

Then run seed script:
```powershell
python backend/scripts/seed_demo_data.py
```

---

## Architecture Summary

### Data Flow: Voice → Simulation → Review

```
User speaks → Gemini transcribes → User confirms
    ↓
Mercora validates order → Maps to Cascade domain
    ↓
Cascade simulates consequences → Evaluates risk → Applies policy
    ↓
Mercora displays analysis → User reviews → (Manual approval if needed)
    ↓
(Execution path not implemented - simulation only)
```

### Mercora–Cascade Boundary

| Owned by Mercora | Owned by Cascade |
|------------------|------------------|
| Products, Customers, Orders, Inventory | Consequence simulation engine |
| Order state and totals | Risk scoring and dimensions |
| Voice transcription | Policy evaluation |
| Demo order mapping | Action execution control |
| | Approval workflow |
| | Audit logging |

**Mapping:** `DEMO_ORDER_MAPPING` in `backend/routers/cascade_integration.py`  
**Separation:** Two databases, explicit API boundary, clear ownership

---

## Verification Checklist

Before demo:
- [ ] Backend running on port 8001
- [ ] Frontend running on port 3000
- [ ] Database seeded (20 orders, 15 products visible)
- [ ] Login successful
- [ ] Dashboard shows populated data
- [ ] Orders page shows demo orders
- [ ] Order ID 21 exists and has correct total (₹97,500)
- [ ] Microphone icon visible on demo orders
- [ ] GEMINI_API_KEY set (if using voice)
- [ ] Microphone permission granted in browser

During demo:
- [ ] Voice recording works (microphone access granted)
- [ ] Transcript appears correctly
- [ ] Simulation modal displays full analysis
- [ ] Risk score and policy decision shown
- [ ] Downstream actions visible in consequence graph
- [ ] Order state unchanged after simulation

---

## Production Considerations

**This is a demo implementation. For production:**

1. Replace demo order mapping with robust order identity system
2. Implement actual execution path with authorization checks
3. Add comprehensive audit logging
4. Implement approval workflow UI
5. Add stale-state revalidation before execution
6. Secure Gemini API key with proper secrets management
7. Add rate limiting and abuse prevention
8. Implement proper error recovery and retry logic
9. Add end-to-end integration tests
10. Deploy Cascade and Mercora with proper infrastructure

---

## Support

For issues or questions:
- Check logs: Backend terminal and Browser console
- Review `backend/.env` configuration
- Verify database connection in `backend/.env`
- Check Cascade API health: http://localhost:8001/api/cascade/health
- Verify Gemini status: http://localhost:8001/api/voice/status

---

**Demo Goal:** Demonstrate that voice input can safely trigger consequence analysis and policy evaluation without bypassing existing safety controls.

**Success Criteria:** Judge sees populated UI, speaks an order request, reviews detailed consequence simulation, and confirms order state is unchanged.
