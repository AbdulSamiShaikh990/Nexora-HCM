# Performance Module - Backend Setup Complete ✅

## Database Models Added

### 1. PerformanceSnapshot
- Stores monthly performance scores and promotion readiness
- **Fields**: employeeId, periodYear, periodMonth, score (0-100), readinessPct (0-100)
- **Unique**: employeeId + periodYear + periodMonth
- **Purpose**: Powers the performance trend line chart

### 2. SkillRating
- Stores skill assessments per employee per month
- **Fields**: employeeId, skill, score (0-100), periodYear, periodMonth
- **Unique**: employeeId + skill + periodYear + periodMonth
- **Purpose**: Powers the skills radar chart

### 3. OKR
- Objectives and Key Results tracking
- **Fields**: employeeId, title, description, status (ON_TRACK|BEHIND|COMPLETED), progressPct (0-100), dueDate
- **Purpose**: OKRs list with progress bars

### 4. Feedback
- 360° feedback records
- **Fields**: employeeId, category (technical|communication|leadership|teamwork), text, quarterYear, quarter (1-4)
- **Purpose**: Feedback count KPI

### 5. PerformanceAlert
- Rule-based performance alerts
- **Fields**: employeeId, type (warning|danger|success), message, triggeredAt
- **Purpose**: Notifications section

## API Endpoints

### GET /api/performance?query=sarah
**Search employees by name or ID**
```json
{
  "employees": [
    { "id": 1, "firstName": "Sarah", "lastName": "Johnson", "department": "Engineering", "email": "..." }
  ]
}
```

### GET /api/performance?employeeId=1
**Get complete performance bundle for an employee**
```json
{
  "kpis": {
    "score": 93,
    "delta": 5,
    "okrs": 3,
    "okrText": "2 on track, 1 behind, 0 completed",
    "feedback": 12,
    "readiness": 85
  },
  "trend": [
    { "month": "Jan", "score": 85 },
    { "month": "Feb", "score": 87 },
    ...
  ],
  "skills": [
    { "skill": "Technical Skills", "score": 90 },
    { "skill": "Communication", "score": 85 },
    ...
  ],
  "okrs": [
    {
      "id": 1,
      "title": "Increase team productivity by 25%",
      "status": "On Track",
      "progress": 78,
      "dueDate": "2024-03-31"
    }
  ],
  "alerts": [
    {
      "type": "success",
      "message": "Score 90%+ for 3 consecutive months → Promotion candidate.",
      "date": "2024-01-15"
    }
  ]
}
```

### POST /api/performance
**Create performance records**

#### Create Snapshot
```json
{
  "type": "snapshot",
  "employeeId": 1,
  "periodYear": 2024,
  "periodMonth": 10,
  "score": 92,
  "readinessPct": 88
}
```

#### Create Feedback
```json
{
  "type": "feedback",
  "employeeId": 1,
  "category": "technical",
  "text": "Excellent problem-solving skills",
  "quarterYear": 2024,
  "quarter": 4
}
```

#### Create OKR
```json
{
  "type": "okr",
  "employeeId": 1,
  "title": "Complete React certification",
  "description": "Finish all modules by end of quarter",
  "dueDate": "2024-12-31"
}
```

#### Create Skill Rating
```json
{
  "type": "skill",
  "employeeId": 1,
  "skill": "Technical Skills",
  "score": 95,
  "periodYear": 2024,
  "periodMonth": 10
}
```

### PATCH /api/performance
**Update OKR progress/status**
```json
{
  "id": 1,
  "progressPct": 85,
  "status": "ON_TRACK"
}
```

## Rule-Based Alerts (Auto-Computed)

The system automatically generates alerts based on performance trends:

1. **Needs Improvement** (danger): Score < 60%
2. **Sudden Drop** (warning): Score drops by 10+ points in one month
3. **Promotion Candidate** (success): Score ≥ 90% for 3 consecutive months
4. **Consistent Underperformance** (danger): Score < 60% for 2+ consecutive months

## Migration Applied

```bash
✅ Migration: 20251019172657_add_performance_models
✅ Tables created: PerformanceSnapshot, SkillRating, OKR, Feedback, PerformanceAlert
```

## Seeding Sample Data

Run this to populate sample performance data for testing:

```bash
npx ts-node prisma/seed-performance.ts
```

This will create:
- 6 months of performance snapshots
- Current month skill ratings
- 2-3 OKRs per employee
- 2-5 feedback records per employee

## Next Steps

1. **Restart your dev server** to load the new Prisma client
2. **Update the frontend** to call the API instead of using mock data
3. **Wire the search box** to `GET /api/performance?query=...`
4. **Wire employee selection** to `GET /api/performance?employeeId=...`
5. **Wire the dialogs** to `POST /api/performance` for feedback and OKRs

## Frontend Integration Example

```typescript
// Search employees
const searchEmployees = async (query: string) => {
  const res = await fetch(`/api/performance?query=${query}`);
  const data = await res.json();
  return data.employees;
};

// Get employee performance
const getEmployeePerformance = async (employeeId: number) => {
  const res = await fetch(`/api/performance?employeeId=${employeeId}`);
  const data = await res.json();
  return data; // { kpis, trend, skills, okrs, alerts }
};

// Submit feedback
const submitFeedback = async (employeeId: number, category: string, text: string) => {
  const now = new Date();
  const res = await fetch('/api/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'feedback',
      employeeId,
      category,
      text,
      quarterYear: now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
    }),
  });
  return res.json();
};

// Add OKR
const addOKR = async (employeeId: number, title: string, description: string, dueDate: string) => {
  const res = await fetch('/api/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'okr',
      employeeId,
      title,
      description,
      dueDate,
    }),
  });
  return res.json();
};
```

## Tech Stack
- **Next.js 15.2.4**
- **Prisma ORM**
- **PostgreSQL**
- **TypeScript**

---

**Status**: ✅ Backend Complete | Frontend Integration Pending
