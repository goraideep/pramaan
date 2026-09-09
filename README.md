# PRAMAAN
**Verify with Evidence. Decide with Confidence.**

An AI-assisted bid compliance verification platform, built as a simplified but fully working prototype for **SIH26100 — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement** (Ministry of Petroleum & Natural Gas / CPCL).

This version is deliberately kept **simple and readable** — plain JavaScript (no TypeScript), a small number of files, and services with heavy comments — so you can open any file and explain exactly what it does to a judge.

---

## 1. What PRAMAAN actually does

A Procurement Officer uploads a bidder's documents (GST certificate, PAN, Udyam certificate, turnover certificate, OEM authorization, etc). PRAMAAN then:

1. **Extracts** structured data from each document (legal name, GSTIN, PAN, turnover, dates...).
2. **Cross-checks** that data between documents — e.g. does the name on the OEM letter match the name on the GST certificate?
3. **Runs a rules-based Compliance Engine** against the tender's requirements (PASS / FAIL / WARNING / PENDING).
4. **Runs a Risk Engine** that turns every failure/warning/discrepancy into an explainable point value, producing a 0–100 risk score.
5. **Writes a plain-language recommendation summarising the above** and always ends it with: *"AI recommendation only. Final decision rests with the Procurement Officer."*
6. Lets the **Procurement Officer** review the evidence and record the actual decision (Qualified / Disqualified / Conditionally Qualified / Needs Clarification).
7. Logs every step to an **append-only audit trail**.

**PRAMAAN never decides anything itself.** Every "AI" output in this app is a decision-support signal, not a verdict.

---

## 2. Important honesty note (read this before your demo)

To keep this buildable and explainable in hackathon time, a few things are **simulated**, and you should say so plainly if asked:

- **OCR / document extraction** is a deterministic "Demo AI Mode" (`server/src/services/aiService.js`) — it doesn't run real OCR on the PDF content, it generates realistic-looking structured data based on the document category and filename (same file → same output, every time). The code has a `tryGemini()` hook already wired up so a real Gemini Vision call can be dropped in later without changing anything else.
- **Government verification** (GSTN, Udyam, PAN, MCA, EPFO, etc.) is **not implemented** in this simplified version — the original spec's 13 government adapters were cut to keep the project a size you can fully understand and defend. The Compliance Engine currently treats non-document-backed checks (like blacklist status) as "Verified (simulated)". This is clearly labelled in the code (`complianceService.js`) as a place a real GSTN/Udyam/MCA API integration would plug in.
- **PDF report generation** was simplified out — you can export the raw JSON of a bidder's verification via the API (`GET /api/bidders/:id`) and screenshot/print the Compliance Command Center page instead. Wiring up a PDF library (e.g. `pdf-lib` or `puppeteer`) later is a self-contained addition.
- **Everything else — auth, RBAC, tenders, bidders, document upload, the compliance engine, the risk engine, cross-document mismatch detection, decisions, and the audit trail — is real and fully working.**

---

## 3. Tech stack

| Layer      | Choice |
|------------|--------|
| Frontend   | React 18 + Vite, Tailwind CSS, React Router, Recharts, Axios |
| Backend    | Node.js + Express (plain JS, CommonJS) |
| Database   | MongoDB + Mongoose |
| Auth       | JWT + bcrypt, role-based middleware |
| File upload| Multer (local disk storage) |
| AI         | Pluggable `aiService.js` — Demo mode by default, Gemini hook ready |

No TypeScript, no shadcn/ui, no TanStack Query — trimmed on purpose so the whole stack is easy to read end-to-end.

---

## 4. Project structure

```
pramaan/
├── server/                     # Express API
│   └── src/
│       ├── config/db.js        # MongoDB connection
│       ├── models/             # Mongoose schemas (User, Tender, Bidder, Document, AuditLog)
│       ├── middleware/         # auth (JWT+RBAC), upload (multer), errorHandler
│       ├── services/
│       │   ├── aiService.js            # document field extraction (demo/Gemini)
│       │   ├── complianceService.js    # rules engine + cross-document checks
│       │   ├── riskService.js          # explainable risk scoring
│       │   └── recommendationService.js# plain-language summary
│       ├── controllers/        # one file per resource
│       ├── routes/             # one file per resource
│       └── seed.js             # loads demo tender + 3 demo bidders
│
├── client/                     # React app
│   └── src/
│       ├── api/api.js          # axios instance (adds JWT header, unwraps responses)
│       ├── context/AuthContext.jsx
│       ├── components/         # Sidebar, Layout, Badge, StatCard
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Tenders.jsx
│           ├── TenderDetail.jsx
│           ├── BidderDetail.jsx  # the "Compliance Command Center"
│           └── Audit.jsx
│
└── README.md (this file)
```

---

## 5. How the core pipeline maps to code

```
Upload document (documentController.uploadDocument)
        │
        ▼
aiService.extractFields()   →  writes Document.extracted
        │
        ▼
"Run Verification" button   →  bidderController.runVerification
        │
        ├─► complianceService.runComplianceEngine()
        │      - evaluates each tender requirement against extracted document data
        │      - findCrossDocumentDiscrepancies() compares legal names across docs
        │
        ├─► riskService.calculateRisk()
        │      - turns FAIL/WARNING/PENDING items + discrepancies into point values
        │
        └─► recommendationService.buildRecommendation()
               - stitches the above into a plain-language paragraph

        ▼
Bidder document is updated with complianceItems, complianceScore,
discrepancies, riskScore, riskLevel, riskFactors, aiRecommendation

        ▼
Officer reviews evidence in the UI, then submits a decision
(bidderController.submitDecision) — this is the ONLY place a
qualification/disqualification is ever recorded.

        ▼
Every step above also writes to AuditLog via utils/audit.js
```

If a judge asks "where's the AI", point at `aiService.js` (extraction) and `recommendationService.js` (natural-language summary) — and explain that the actual pass/fail *decision logic* is a transparent, auditable rules engine (`complianceService.js` + `riskService.js`), which is a deliberate design choice for a government procurement context where every result needs to be explainable and defensible, not a black box.

---

## 6. Data model (kept intentionally small)

- **User** — name, email, password hash, role (`officer` / `reviewer` / `admin`)
- **Tender** — tenderId, title, org info, and an embedded array of `requirements` (key, label, weight, mandatory, threshold)
- **Bidder** — belongs to a Tender; embeds the *results* of the last verification run (complianceItems, riskFactors, discrepancies, aiRecommendation, decision) directly on the document, instead of spreading them across many collections. This was a deliberate simplification from the original spec's 14-model design — fewer collections to join, easier to reason about, still fully normalized for the things that genuinely repeat (documents, audit logs).
- **Document** — belongs to a Bidder; stores the uploaded file's path and its `extracted` fields.
- **AuditLog** — append-only; one row per action.

---

## 7. Roles

| Role | Can |
|---|---|
| **Procurement Officer** | create tenders, add bidders, upload documents, run verification, submit the final decision |
| **Reviewer** | view everything, run verification, cannot submit a decision |
| **Admin** | same visibility as reviewer (user/system management screens were scoped out of this simplified build — the `User` model and `admin` role already exist so this is a small addition later) |

---

## 8. Running it locally

### Prerequisites
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

### Backend
```bash
cd server
npm install
cp .env.example .env        # already done for you, edit if needed
npm run seed                # loads demo users + 1 tender + 3 bidders
npm run dev                 # starts the API on http://localhost:5000
```

### Frontend
```bash
cd client
npm install
cp .env.example .env        # already done for you, points at localhost:5000/api
npm run dev                 # starts the app on http://localhost:5173
```

### Demo login
| Role | Email | Password |
|---|---|---|
| Procurement Officer | `officer@pramaan.demo` | `Pramaan@123` |
| Reviewer | `reviewer@pramaan.demo` | `Pramaan@123` |
| Administrator | `admin@pramaan.demo` | `Pramaan@123` |

To reset the demo at any time, just re-run `npm run seed` (it wipes and reloads everything).

---

## 9. The 3 seeded demo bidders

| Bidder | Scenario |
|---|---|
| **ABC Industries Pvt Ltd** | Clean pass — all documents consistent, turnover above threshold → high score, low risk |
| **Bharat Industrial Solutions** | Mixed — a minor name variation on one document (low-severity discrepancy), turnover just below the ₹10 Cr threshold, and one low-confidence extraction → medium score/risk |
| **XYZ Engineering Ltd** | Problem case — OEM Authorization document has a completely different company name (critical discrepancy), an expired GST certificate, and turnover far below threshold → low score, high risk |

Open **Tenders → CPCL/PROC/2026/001** and click each bidder to see the Compliance Command Center for that scenario.

---

## 10. API reference

All routes except `/api/auth/login` and `/api/health` require `Authorization: Bearer <token>`.

```
POST   /api/auth/login                    { email, password } → { token, user }
GET    /api/auth/me

GET    /api/tenders
POST   /api/tenders                       officer/admin only
GET    /api/tenders/:id
PUT    /api/tenders/:id                   officer/admin only

GET    /api/tenders/:tenderId/bidders
POST   /api/tenders/:tenderId/bidders     officer/admin only

GET    /api/bidders/:id                   returns { bidder, documents }
POST   /api/bidders/:id/verify            officer/reviewer/admin — runs the compliance+risk+AI pipeline
POST   /api/bidders/:id/decision          officer only — { status, reason, remarks }
GET    /api/bidders/:id/audit

POST   /api/bidders/:id/documents         officer/admin only — multipart/form-data { file, category }
GET    /api/bidders/:id/documents

GET    /api/dashboard/stats
GET    /api/audit
```

Standard response shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## 11. Security

- Passwords hashed with bcrypt, never stored or logged in plain text
- JWT auth on every protected route, checked in `middleware/auth.js`
- Role checks via `allowRoles(...)` middleware on sensitive routes
- File upload restricted by mime type (PDF/PNG/JPG) and size (10MB) in `middleware/upload.js`
- CORS enabled, structured error responses so stack traces never leak to the client
- No secrets in the frontend — `GEMINI_API_KEY` only ever lives in `server/.env`

---

## 12. Known limitations / what's cut for time

Being upfront about this is a strength in front of judges, not a weakness:

- No real OCR — Demo AI Mode is deterministic/simulated (see §2)
- No real government API integrations (GSTN/Udyam/MCA/EPFO/etc.) — architecture has an obvious slot for them in `complianceService.js`
- No PDF report export — JSON export via API only
- No bidder-comparison screen, notifications, or global search — the core verification pipeline was prioritized over these secondary features
- No automated test suite — given the time budget, effort went into keeping the compliance/risk logic itself simple and readable instead
- Admin user-management screens aren't built (the `admin` role and `User` model exist, just no UI yet)

## 13. Natural next steps (good "future work" slide)

1. Real OCR/Gemini Vision call inside `aiService.tryGemini()`
2. Real GSTN/Udyam/MCA sandbox APIs behind the same `complianceService.js` interface
3. PDF report generation for the compliance report
4. Bidder comparison view, notifications, global search
5. Automated tests for `complianceService.js` and `riskService.js` (pure functions, easy to unit test)
