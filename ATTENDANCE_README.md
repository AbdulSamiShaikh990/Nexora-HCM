# NEXORA HCM — Attendance System Documentation

This document provides end-to-end documentation of the Attendance subsystem: architecture, database schema, backend APIs, frontend flows, deployment, and SRS-style requirements. It reflects the current consolidated implementation in this repo.

- Backend: Next.js App Router APIs (TypeScript) with Prisma and PostgreSQL
- Frontend: Next.js UI (Server + Client components)
- Database: PostgreSQL (managed via Prisma)

---

## 1) Architecture Overview

- **Layers**
  - **Database**: PostgreSQL with Prisma schema and migrations.
  - **ORM**: Prisma Client (`@prisma/client`).
  - **API**:
    - `GET/POST/PUT/DELETE /api/attendance` for CRUD, stats, live status, and export (unified).
    - `GET/POST/PUT/DELETE /api/attendance/requests` for correction requests (list, create, approve, reject).
  - **Frontend**:
    - Admin page: `src/app/admin/attendance/page.tsx`
      - Shift Management tab (daily table, date/dept filter, assign shifts, export).
      - Self-Service tab (correction requests approve/reject).
      - Live tab (in/out lists).
    - Employee page (optional): `src/app/employee/attendance` (view-only).

- **Data Flow**
  - UI selects date/department → calls `GET /api/attendance?date=YYYY-MM-DD&department=...`.
  - KPIs → `GET /api/attendance?mode=stats`.
  - Live status → `GET /api/attendance?mode=live`.
  - Export → `GET /api/attendance?format=csv|excel`.
  - Correction requests → `GET/POST/PUT/DELETE /api/attendance/requests`.

---

## 2) Database Schema (Prisma)

Path: `prisma/schema.prisma`

- **Models**
  - `Employee`:
    - Core employee record, has many `attendance` and `attendanceCorrections`.
  - `Attendance`:
    - `date: DateTime` (UTC midnight for the date)
    - `checkIn: DateTime?`
    - `checkOut: DateTime?`
    - `status: string` ("Present" | "Late" | "Absent")
    - Unique constraint `@@unique([employeeId, date])`
    - Indexes on `date`, `employeeId`
  - `AttendanceCorrection`:
    - A self-service change request from employees
    - `date`, `issue`, optional `requestedCheckIn/Out`, `note`
    - `state: "pending" | "approved" | "rejected"` (default "pending")
    - Indexes on `date`, `employeeId`, `state`

```prisma
model Attendance {
  id         Int       @id @default(autoincrement())
  date       DateTime
  checkIn    DateTime?
  checkOut   DateTime?
  status     String
  employeeId Int
  employee   Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([employeeId, date])
  @@index([date])
  @@index([employeeId])
}

model AttendanceCorrection {
  id                Int      @id @default(autoincrement())
  employeeId        Int
  date              DateTime
  issue             String
  requestedCheckIn  DateTime?
  requestedCheckOut DateTime?
  note              String?
  state             String   @default("pending")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  employee          Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([date])
  @@index([employeeId])
  @@index([state])
}
```

- **ER Diagram (Simplified)**

```mermaid
erDiagram
  Employee ||--o{ Attendance : has
  Employee ||--o{ AttendanceCorrection : requests

  Employee {
    Int id PK
    String email
    String department
    ...
  }

  Attendance {
    Int id PK
    Date date
    Date checkIn
    Date checkOut
    String status
    Int employeeId FK
  }

  AttendanceCorrection {
    Int id PK
    Int employeeId FK
    Date date
    String issue
    Date requestedCheckIn
    Date requestedCheckOut
    String note
    String state
  }
```

---

## 3) Backend API (Unified)

Base directory:
- `src/app/api/attendance/route.ts`
- `src/app/api/attendance/requests/route.ts`

### 3.1 Attendance API

Path: `src/app/api/attendance/route.ts`

- Query params (shared):
  - `date=YYYY-MM-DD`
  - `department=all|engineering|marketing|sales|hr`
  - `employeeId=<number>`
  - `shiftStart=HH:mm` (default 09:00)
  - `shiftEnd=HH:mm` (default 18:00)
  - Pagination: `page`, `size`

- Modes:
  - `mode=stats`: returns KPIs for the day.
  - `mode=live`: returns in/out lists for the day.
  - `format=csv|excel`: returns a file download.

Endpoints:

- GET /api/attendance
  - List (default mode):
    - Returns paginated attendance with computed deltas (late/early/ot computed on frontend using shift inputs).
  - Stats:
    - `?mode=stats&date=YYYY-MM-DD&department=...`
    - Response:
      - `total`, `present`, `late`, `absent`, `avgHours`, `attendanceRate`
  - Live:
    - `?mode=live&date=YYYY-MM-DD&department=...`
    - Response:
      - `in: [ { id, employee, department, checkIn, status } ]`
      - `out: [ { id, employee, department, checkOut, status } ]`
  - Export:
    - `?format=csv` or `?format=excel` with `date`, `department`
    - Content-Disposition download with filename `attendance-YYYY-MM-DD.csv|xls`.

- POST /api/attendance
  - Create or upsert an attendance record (one per employee per date due to unique constraint).
  - Body example:
```json
{
  "employeeId": 12,
  "date": "2025-10-17",
  "checkIn": "09:10",
  "checkOut": "18:00",
  "status": "Present"
}
```

- PUT /api/attendance
  - Update by `id` or by `(employeeId + date)`.
  - Body example:
```json
{
  "id": 123,
  "date": "2025-10-17",
  "checkIn": "09:00",
  "checkOut": "18:05",
  "status": "Present"
}
```

- DELETE /api/attendance
  - Delete by `id` parameter (query).

### 3.2 Correction Requests API

Path: `src/app/api/attendance/requests/route.ts`

- GET /api/attendance/requests
  - Query: `state=pending|approved|rejected`, `date`, `department`, `page`, `size`
  - Returns paginated enriched records with employee info.

- POST /api/attendance/requests
  - Create a request:
```json
{
  "employeeId": 12,
  "date": "2025-10-17",
  "issue": "Missed check-in",
  "requestedCheckIn": "09:05",
  "note": "Client call during commute"
}
```

- PUT /api/attendance/requests?id=<id>
  - Approve the request and apply to `Attendance`.
  - If the record exists, updates times. If absent, creates a new `Attendance` row (status becomes `Present` if times provided).

- DELETE /api/attendance/requests?id=<id>
  - Rejects a pending request.

---

## 4) Frontend Implementation

Path: `src/app/admin/attendance/page.tsx`

- **Tabs**
  - **Shift Management**
    - Controls:
      - Department dropdown.
      - Date picker (modal; cannot pick future dates).
      - Filter modal (Status filter).
      - Assign Shifts modal (sets `shiftStart`, `shiftEnd` locally).
      - Export Excel (downloads via `GET /api/attendance?format=excel&date=...`).
    - Daily table:
      - Columns: Employee, In, Out, Total, Late, Early Dep., Overtime, Status.
      - Deltas computed on client using `shiftStart`/`shiftEnd` and row times.
  - **Self-Service**
    - Lists pending correction requests with Approve/Reject actions.
    - Approve: `PUT /api/attendance/requests?id=...`
    - Reject: `DELETE /api/attendance/requests?id=...`
  - **Live Status**
    - In/Out lists:
      - `GET /api/attendance?mode=live&date=...&department=...`

- **UX Notes**
  - The date picker is clamped to today (`max=today` and clamping in state).
  - Filter currently applies only on client to visible rows (status-based).
  - Assign Shifts updates session-state; persistence can be added if required (see Enhancements).

---

## 5) Setup & Deployment

- **Environment**
  - `.env`:
    - `DATABASE_URL=postgresql://...`

- **Install**
```bash
npm install
```

- **Prisma**
```bash
npx prisma generate
npx prisma migrate dev --name init_attendance   # if you need to create/apply schema
```

- **Dev**
```bash
npm run dev
# http://localhost:3000/admin/attendance
```

- **Build**
```bash
npm run build
npm start
```

---

## 6) Sample Requests

- List (daily)
```bash
curl "http://localhost:3000/api/attendance?date=2025-10-17&department=all"
```

- Stats
```bash
curl "http://localhost:3000/api/attendance?mode=stats&date=2025-10-17&department=hr"
```

- Live
```bash
curl "http://localhost:3000/api/attendance?mode=live&date=2025-10-17&department=engineering"
```

- Export (Excel)
```bash
curl -L -o attendance.xls "http://localhost:3000/api/attendance?format=excel&date=2025-10-17&department=all"
```

- Create attendance
```bash
curl -X POST "http://localhost:3000/api/attendance" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":12,"date":"2025-10-17","checkIn":"09:10","checkOut":"18:00","status":"Present"}'
```

- Create correction request
```bash
curl -X POST "http://localhost:3000/api/attendance/requests" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":12,"date":"2025-10-17","issue":"Missed check-in","requestedCheckIn":"09:05","note":"Client call"}'
```

- Approve request
```bash
curl -X PUT "http://localhost:3000/api/attendance/requests?id=15"
```

- Reject request
```bash
curl -X DELETE "http://localhost:3000/api/attendance/requests?id=15"
```

---

## 7) Business Logic and Rules

- **One record per employee per day** enforced by `@@unique([employeeId, date])`.
- **Status rules** (simplified):
  - If both `checkIn` and `checkOut` exist, `status` is typically `Present`.
  - `Late` if `checkIn > shiftStart`.
  - `Absent` if no `checkIn` exists (or determined by external policy).
- **Computed fields**:
  - Late minutes: `(checkIn - shiftStart)+`
  - Early departure: `(shiftEnd - checkOut)+`
  - Overtime: `(checkOut - shiftEnd)+`
  - Total hours: `checkOut - checkIn` (all calculated client-side for now).

- **Correction workflow**
  - Employee submits a correction.
  - Admin approves → Applies requested times to `Attendance`:
    - Update existing or create new.
    - Status switched to `Present` if times are provided.
  - Admin rejects → state set to `rejected`.

---

## 8) Security & Validation

- **Authentication/Authorization**
  - Integrate with app auth (e.g., `next-auth`) to restrict admin routes.
  - Only admins can approve/reject corrections.
  - Employees can only create/view their own corrections.

- **Validation**
  - Enforce date format `YYYY-MM-DD`.
  - Clamp future dates on UI.
  - Restrict department values to known set.

- **Rate limiting**
  - Recommended for public APIs; e.g., add middleware.

---

## 9) Performance & Indexing

- **Indexes**
  - `Attendance`: `date`, `employeeId`
  - `AttendanceCorrection`: `date`, `employeeId`, `state`

- **Pagination**
  - Use `page` and `size` (default size 50) on list endpoints.

- **Batching**
  - Prefer `findMany` with `include/select` instead of multiple per-row lookups.

---

## 10) Testing

- **Unit**
  - Pure functions like time deltas (client) can be unit-tested easily.
- **API**
  - Use `supertest` or `next-test-api-route-handler`.
  - Seed minimal data before tests.

- **Manual**
  - Use `curl` examples above.
  - Verify export downloads.

---

## 11) Error Handling

- Common HTTP codes:
  - `400` for invalid params
  - `404` for not found (e.g., correction request not found)
  - `409` for unique violation (if duplicate attendance)
  - `500` for server errors

- Standard JSON error:
```json
{ "error": "message" }
```

---

## 12) Non-Functional Requirements (SRS style)

- **Reliability**: Unique per-day per-employee, idempotent updates.
- **Performance**: Indexed queries; pagination.
- **Usability**: Simple filters; export; live status visuals.
- **Security**: Role-based access control (admin vs employee).
- **Maintainability**: Consolidated endpoints (`/api/attendance` and `/api/attendance/requests` only).
- **Scalability**: PostgreSQL with Prisma; can shard by department/date in future.

---

## 13) Functional Requirements (SRS style)

- **FR-1**: Admin can view attendance by date and department.
- **FR-2**: Admin can view daily KPIs (present, late, absent, avg hours, rate).
- **FR-3**: Admin can view live in/out lists.
- **FR-4**: Admin can export attendance in CSV/Excel.
- **FR-5**: Admin can approve/reject attendance correction requests.
- **FR-6**: Employee can submit correction requests with requested times.
- **FR-7**: System enforces one attendance record per employee per date.
- **FR-8**: UI prevents choosing future dates.
- **FR-9**: UI supports filtering table by status.

---

## 14) Future Enhancements

- Persist assigned shifts per day/department in DB (e.g., `Shift` model).
- Server-side computation of deltas (move current client deltas into API).
- Real-time updates via WebSocket or polling for live tab.
- Calendar view (weekly/monthly) and bulk exports.
- Advanced filters: name search, time ranges, lateness thresholds.

---

## 15) File Map (Attendance)

- Backend:
  - `src/app/api/attendance/route.ts`
  - `src/app/api/attendance/requests/route.ts`
- Frontend:
  - `src/app/admin/attendance/page.tsx`
- Database:
  - `prisma/schema.prisma`
- Docs:
  - `ATTENDANCE_BACKEND_SETUP.md`
  - `COMPLETE_ATTENDANCE_GUIDE.md`

---

End of document.
