# Replit Prompt — Training Log & Staff Certification Tracker

Paste this directly into Replit chat:

---

Build a **Training Log & Staff Certification Tracker** as a new module within the Training Templates domain. This is a new feature — not a redesign of anything existing. It turns the six training manuals from one-time generated documents into an ongoing operational record that tracks every employee's training history, assessment scores, certification status, and manager sign-offs.

Match the established dark theme throughout: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text.

**DO NOT CHANGE:**
- Any existing training manual templates or generation logic
- Setup page or its variable system
- Any other domain pages or modules
- Stripe/RevenueCat subscription logic
- Tier gating — this feature is locked behind paid tier, gated via existing UpgradeGate component

---

## WHAT THIS FEATURE DOES

Every time a new employee completes training, the manager records it here:
- Employee name, role, hire date
- Which manual was used
- Assessment score
- Certification date
- Manager who signed off
- Any notes

The platform maintains a permanent record of all training events for every employee. That record is exportable as a PDF for TWC disputes, printable for employee files, and visible at a glance on the Training Log dashboard.

---

## DATABASE SCHEMA

Create two new tables:

```sql
CREATE TABLE staff_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,         -- Server, Bartender, Host, Busser, Kitchen, Manager
  hire_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, terminated
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE training_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_member_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  manual_type VARCHAR(50) NOT NULL,    -- server, kitchen, bartender, host, busser, manager
  training_start_date DATE NOT NULL,
  certification_date DATE,             -- null until certified
  assessment_score INTEGER,            -- 0–100, null until assessment completed
  assessment_passed BOOLEAN,           -- true if score >= passing threshold
  certified BOOLEAN DEFAULT FALSE,
  certified_by VARCHAR(100),           -- manager name who signed off
  additional_training_days INTEGER DEFAULT 0, -- days added beyond standard
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_member_id, manual_type) -- one training record per employee per manual type
);
```

---

## API ENDPOINTS

```
GET    /api/training/staff                    — all staff members for current user
POST   /api/training/staff                    — add new staff member
PUT    /api/training/staff/:id                — update staff member
DELETE /api/training/staff/:id                — deactivate (soft delete) staff member

GET    /api/training/records                  — all training records for current user
GET    /api/training/records/:staffId         — all records for a specific employee
POST   /api/training/records                  — create new training record
PUT    /api/training/records/:id              — update training record
DELETE /api/training/records/:id              — delete record (with confirmation, manager only)

GET    /api/training/summary                  — certification stats for dashboard widget
GET    /api/training/export/:staffId          — generate exportable record for one employee
GET    /api/training/export/all               — generate exportable record for all staff
```

All endpoints require authentication. All endpoints verify ownership before any read/write/delete.

---

## PAGE STRUCTURE — Training Log tab within Training Templates

Add "Training Log" as a prominent tab or section at the top of the Training Templates domain, alongside the existing manual cards. It is not buried — it is a co-equal feature with the manuals.

---

### SECTION 1: CERTIFICATION OVERVIEW — STATUS STRIP

A horizontal strip of 4 metric cards at the top of the Training Log, matching the Operator Command Strip style on the dashboard:

- **Total Staff** — count of active staff members
- **Fully Certified** — count of staff with at least one completed certification
- **In Training** — count of staff with an open (started but not certified) training record
- **Certifications This Month** — count of training records with certification_date in the current calendar month

Each card: dark background, gold left border, white number large, muted label below. Click on any card filters the staff table below to that subset.

---

### SECTION 2: STAFF TABLE

Full-width table of all active staff members. Default sort: role ascending, then hire date ascending.

Columns:

| Employee | Role | Hire Date | Manuals Certified | Last Certified | Status | Actions |
|---|---|---|---|---|---|---|

- **Employee:** first + last name, gold text
- **Role:** badge pill — color-coded by role (Server: blue, Bartender: amber, Host: teal, Busser: gray, Kitchen: orange, Manager: gold)
- **Hire Date:** formatted "Mar 6, 2026"
- **Manuals Certified:** "3 of 6" with a small progress bar — fills gold as certifications complete. 6 is the total number of available manuals.
- **Last Certified:** most recent certification_date across all records for this employee, formatted as relative time ("14 days ago") with full date on hover
- **Status:** green "Active" / amber "In Training" / gray "Inactive" badge
- **Actions:** View (eye icon) | Edit (pencil) | Add Training (+ icon) | Export Record (download icon)

**Empty state:**
```
No staff members yet.
Add your first employee to start tracking certifications.
[ + Add Employee ]
```

**Search and filter bar above the table:**
- Text search by name
- Filter by role (dropdown)
- Filter by status (All / Active / In Training / Certified / Inactive)
- Filter by manual type (All / Server / Kitchen / Bartender / Host / Busser / Manager)

---

### SECTION 3: ADD / EDIT EMPLOYEE MODAL

Triggered by "+ Add Employee" button (top right of staff table) or the edit action on any row.

**Fields:**

```
First Name *          Last Name *
[______________]      [______________]

Role *
[ Select role ▼ ]  — Server / Bartender / Host / Busser / Kitchen Staff / Manager

Hire Date *
[ MM/DD/YYYY   ]

Status
[ Active ▼ ]  — Active / Inactive / Terminated

Notes (optional)
[_________________________________]
e.g. "Part-time, weekend shifts only"
```

Save button: gold, full width. Cancel: gray text link.

On save: employee appears in the staff table. If role matches an available manual (all 6 do), a prompt appears:

```
[Name] has been added as a [Role].
Would you like to start a training record for them now?

[ + Start Training Record ]    [ Not yet ]
```

---

### SECTION 4: ADD / EDIT TRAINING RECORD MODAL

Triggered by "+ Start Training Record" prompt, the Add Training action on a staff row, or editing an existing record.

**Fields:**

```
Employee
[ Pre-filled if triggered from staff row, otherwise searchable dropdown ]

Manual / Training Program *
[ Select manual ▼ ]
Server Manual / Kitchen Manual / Bartender Manual /
Host Manual / Busser Manual / Manager Manual

Training Start Date *
[ MM/DD/YYYY ]

Certification Date
[ MM/DD/YYYY ]   ← leave blank if still in training

Assessment Score
[ ___ ] / 100    ← leave blank if not yet taken

Assessment Passed
[ ✓ Passed ]  [ ✗ Needs Additional Training ]
← auto-sets based on score vs. passing threshold:
   Server/Kitchen/Bartender/Manager: 90% (9/10 questions)
   Host/Busser: 90% (9/10 questions)
   Override available for manager to manually set

Additional Training Days Required
[ 0 ] days beyond standard program

Certified By (Manager Name) *
[ ____________________ ]  — required to mark as certified

Notes
[_________________________________]
e.g. "Strong on TABC, needs work on POS. Passed on second assessment."
```

**Certification status auto-logic:**
- If certification_date is filled AND certified_by is filled AND assessment_passed is true → `certified: true`
- If any of the three are missing → `certified: false`, status shows "In Training"
- All three required to mark as certified — enforce with validation

Save button: gold. If certifying for the first time, save button reads **"Certify Employee"** instead of "Save" — weight the moment.

---

### SECTION 5: EMPLOYEE DETAIL VIEW

Triggered by the View action on any staff row. Full-width slide-in panel or modal showing complete training history for one employee.

**Header:**
```
[First Last]                           [ Export Record ]  [ Edit Employee ]
[Role] · Hired [date] · [Active/Inactive]
```

**Training History Timeline:**
Each training record rendered as a timeline card, most recent first:

```
┌─────────────────────────────────────────────────────┐
│  ✓ SERVER MANUAL                    Mar 6, 2026      │
│  Certified by: Ben Mouton                            │
│  Score: 92/100 · Passed                              │
│  Training: Feb 28 – Mar 6 (7 days)                  │
│  Notes: "Strong on ROAR and HEAT protocols."         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⏳ BARTENDER MANUAL               In Progress       │
│  Started: Mar 6, 2026                                │
│  Assessment: Not yet taken                           │
└─────────────────────────────────────────────────────┘
```

Certified records: gold ✓, gold title, full details.
In-progress records: amber ⏳, muted title, partial details.

**Certifications Summary:**
Small grid showing all 6 manuals with status icons:
✓ Certified / ⏳ In Progress / — Not Started

**Upgrade nudge (if applicable):**
If the employee's role matches a manual they haven't started yet AND the operator is on a paid plan, show a subtle inline card:

```
[Name] hasn't completed the Manager Manual yet.
That's the certification that lets them run the floor solo.
[ + Start Manager Training ]
```

---

### SECTION 6: EXPORT & PRINT

**Individual employee export:**
Triggered by the Export Record button on the staff table row or the detail view.

Generates a clean, formatted PDF document:

**Page 1 — Cover:**
- Restaurant name: `{{restaurantName}}`
- Document title: "Employee Training Record"
- Employee name, role, hire date
- Export date
- Footer: "Confidential — `{{restaurantName}}` Internal Use Only"

**Page 2+ — Training History:**
For each training record:
- Manual name and type
- Training dates (start → certification)
- Assessment score and pass/fail
- Manager who certified
- Any additional training days
- Notes
- A signature line: "Manager Signature: _______________ Date: ________"

Style: clean black on white, professional. No dark backgrounds. Tables with light gray borders. Same print CSS standards as the training manuals.

**Bulk export:**
"Export All Staff Records" button at the top of the Training Log — generates a single PDF with all active employees, or a ZIP file with individual PDFs per employee. Manager's choice via a small modal:

```
Export all training records as:
( ) Single PDF — all employees in one document
( ) Individual PDFs — one file per employee (downloaded as ZIP)

[ Export ]
```

**CSV export:**
Also available — exports a flat CSV with one row per training record:
Employee Name, Role, Hire Date, Manual, Start Date, Cert Date, Score, Passed, Certified By, Notes.

File name: `{{restaurantName}}-training-records-[YYYY-MM-DD].csv`

---

### SECTION 7: DASHBOARD WIDGET

Add a Training Log widget to the dashboard Operator Command Strip alongside the Prime Cost widget:

```
Certified This Month   4  →
```

Gold number, muted label, arrow links to Training Log. If zero certifications this month:

```
Certifications   0 this month  →
```

---

### UPSELL INTEGRATION

Two natural upsell moments wired into the Training Log:

**Moment 1 — Role without a manual:**
When a manager adds a staff member with a role that matches one of the 6 manuals AND that manual hasn't been generated yet, show a nudge:

```
You don't have a [Role] Manual generated yet.
Generate it now so [Name] trains to your standard.
[ Generate [Role] Manual ]
```

**Moment 2 — 3+ staff certified, Manager Manual not generated:**
After the 3rd certification of any kind is recorded, show a one-time banner:

```
You've certified [X] staff members.
The Manager Manual is the certification that protects
everything you just built. Is your manager trained to the
same standard as your servers?
[ Generate Manager Manual ]   [ Dismiss ]
```

Show once per user, never again after dismissed. Store dismissal in user record or localStorage.

---

## TIER GATING

Wrap the entire Training Log in the existing `<UpgradeGate>` component.

Add to the upgrade gate copy map:
```
'training-log': {
  headline: "Training Without a Record Is Just a Conversation",
  sub: "Track every certification, every assessment score, every manager sign-off. Your TWC documentation lives here — and it's exportable when you need it."
}
```

Free users see the blur overlay. Paid users have full access.

---

## RENDERING STANDARDS

All components match existing platform standards:
- Status strip metric cards: gold left border, `#1a1d2e` background, large white number, muted gray label
- Role badge pills: small rounded pill, role-specific color, white text
- Timeline cards: `border: 1px solid` (gold for certified, amber for in-progress), `#1a1d2e` background
- Modals: dark overlay `rgba(0,0,0,0.7)`, card `#1a1d2e`, gold border, max-width 560px, centered
- Table: header `background: #b8860b`, `color: #0f1117`, alternating rows `#1a1d2e` / `#12141f`
- Export PDF: black on white, no dark backgrounds, Georgia or similar serif font, professional document layout
- All status colors: green `#22c55e` (certified), amber `#d4a017` (in training), gray `#6b7280` (inactive)

---

## IMPLEMENTATION ORDER

1. Database migration — create `staff_members` and `training_records` tables
2. All API endpoints with authentication and ownership verification
3. Certification status calculation logic (server-side)
4. Staff table component with search and filter
5. Add/Edit Employee modal
6. Add/Edit Training Record modal with auto-certification logic
7. Employee Detail view / slide-in panel
8. Certification Overview status strip
9. Export: individual PDF, bulk PDF/ZIP, CSV
10. Dashboard widget in Operator Command Strip
11. Post-add-employee training prompt
12. Upsell moments (role without manual + 3-cert banner)
13. Apply UpgradeGate wrapper with new copy
14. Navigation — add Training Log as primary tab in Training Templates
15. Mobile responsiveness pass — modals and table must work on iPhone

---

## SUCCESS CRITERIA

- A manager can add an employee, start a training record, enter an assessment score, and certify them in under 2 minutes
- The certification status auto-sets correctly: all three required fields (certification date, manager name, assessment passed) must be present for `certified: true`
- The staff table correctly shows "3 of 6" progress and the correct status badge for each employee
- The individual employee PDF export generates a clean, professional document with all training records and a signature line
- The dashboard widget correctly shows certifications this month
- The upsell nudge for Manager Manual fires after the 3rd certification and never shows again after dismissal
- A free-tier user sees the UpgradeGate overlay with the correct copy
- All data is scoped to the current user — no operator can see another operator's staff records

Make all changes to the Training Templates domain and dashboard only. Do not touch any other modules, training manual templates, Setup logic, Stripe integration, or tier configuration.
