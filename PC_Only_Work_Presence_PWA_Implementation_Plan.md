# PC-Only Work Presence PWA --- Implementation Plan

## 1. Objective

Build a lightweight **PC-only Progressive Web App (PWA)** for remote
employees.

The system will have only one core purpose:

> Show whether an employee is **ACTIVE** or **NOT ACTIVE** during their
> work session.

No Windows desktop agent is required.

No mobile tracking is required.

No keyboard, mouse, screen, or personal-content monitoring is required.

------------------------------------------------------------------------

## 2. Core Architecture

``` text
                    ┌──────────────────────┐
                    │    ADMIN WEB PANEL   │
                    │                      │
                    │ Employees            │
                    │ Live Status          │
                    │ Attendance           │
                    └──────────┬───────────┘
                               │
                         REST + WebSocket
                               │
                    ┌──────────▼───────────┐
                    │      BACKEND API     │
                    │                      │
                    │ Authentication       │
                    │ Device Registration  │
                    │ Clock In / Out       │
                    │ Heartbeat            │
                    │ Presence Engine      │
                    └──────────┬───────────┘
                               │
                         ┌─────▼─────┐
                         │ Database  │
                         └───────────┘
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │    EMPLOYEE PWA     │
                    │    PC Browser Only  │
                    │                     │
                    │ Clock In             │
                    │ ACTIVE               │
                    │ Clock Out            │
                    └─────────────────────┘
```

------------------------------------------------------------------------

## 3. Employee Onboarding

Admin creates an employee:

-   Name
-   Employee ID
-   Email
-   Department
-   Account status

The system generates a unique registration link/token.

Employee opens the link from their work PC and registers that
browser/device.

Example:

``` text
Employee: Rahim
Employee ID: EMP-001

[ Register This PC ]
```

After successful registration:

``` text
EMP-001
   ↓
Registered PC/Browser
   ↓
Work PWA
```

------------------------------------------------------------------------

## 4. PC-Only Access

The employee portal must reject mobile and tablet devices.

Allowed:

-   Windows PC
-   macOS PC
-   Linux PC (optional)

Blocked:

-   Android
-   iPhone
-   iPad
-   Mobile browsers
-   Tablet browsers
-   Mobile "Desktop Site" mode

The system should not rely only on screen width.

Use multiple browser/device signals and the registered-device
relationship.

> Browser-based device detection is not perfectly tamper-proof. If
> stronger enforcement is required later, an optional Windows Agent can
> be added.

------------------------------------------------------------------------

## 5. Employee Workflow

### Start of Work

Employee opens the PWA:

``` text
WORK PORTAL

Rahim
EMP-001

Status: NOT ACTIVE

[ CLOCK IN ]
```

After Clock In:

``` text
Status: 🟢 ACTIVE
Clock In: 08:30 AM
```

### During Work

The PWA automatically sends heartbeat signals to the server.

Employee does not need to press anything.

### End of Work

Employee presses:

``` text
[ CLOCK OUT ]
```

The session is closed.

------------------------------------------------------------------------

## 6. Heartbeat System

While the employee is clocked in, the PWA sends a heartbeat
approximately every 30 seconds.

Example:

``` text
PWA
 │
 ├── heartbeat
 │
 ├── 30 seconds
 │
 ├── heartbeat
 │
 ├── 30 seconds
 │
 └── heartbeat
```

The backend stores only the latest heartbeat time:

``` text
last_seen = current timestamp
```

Do not create a database row for every heartbeat unless detailed event
history is specifically required.

------------------------------------------------------------------------

## 7. ACTIVE / NOT ACTIVE Logic

Recommended rule:

-   Heartbeat received recently → `ACTIVE`
-   No heartbeat for approximately 90 seconds → `NOT ACTIVE`

Using three missed heartbeat intervals prevents short network
fluctuations from immediately changing the employee to inactive.

Example:

``` text
Last heartbeat: 10:20:00

10:20:30  No heartbeat
10:21:00  No heartbeat
10:21:30  No heartbeat

Result:
🔴 NOT ACTIVE
```

The system should not claim the reason for inactivity.

For example, it should NOT automatically label it:

-   Load shedding
-   Internet failure
-   PC shutdown
-   Browser closed

All of these should simply result in:

> `NOT ACTIVE`

------------------------------------------------------------------------

## 8. Real-Time Admin Dashboard

Use WebSocket/Socket.IO for live updates.

Example:

``` text
LIVE WORK STATUS

Employee       Status          Last Seen
------------------------------------------
Rahim          🟢 ACTIVE       5 sec ago
Karim          🟢 ACTIVE       12 sec ago
Sumi           🔴 NOT ACTIVE   4 min ago
Jamal          🟢 ACTIVE       8 sec ago
```

The dashboard should update automatically without a page refresh.

------------------------------------------------------------------------

## 9. Clock-In / Clock-Out Session

Each work session contains:

``` text
session_id
employee_id
clock_in
clock_out
status
last_seen
created_at
```

Example:

``` text
Employee: Rahim

Clock In:  08:30 AM
Clock Out: 04:30 PM
```

Presence can change independently during the session:

``` text
08:30 → 10:15   ACTIVE
10:15 → 10:32   NOT ACTIVE
10:32 → 04:30   ACTIVE
```

------------------------------------------------------------------------

## 10. Database Design

### employees

``` text
id
name
employee_code
email
department
status
registered_device
created_at
```

### work_sessions

``` text
id
employee_id
clock_in
clock_out
status
last_seen
created_at
```

### presence_events

Optional table if detailed presence history is required:

``` text
id
session_id
status
timestamp
```

For the first version, detailed heartbeat records are unnecessary.

------------------------------------------------------------------------

## 11. Security

Employee authentication must be required.

The server must enforce:

-   Employee can only access their own account
-   Employee cannot modify another employee's status
-   Duplicate Clock In must be prevented
-   Clock Out must close the active session
-   Heartbeats after Clock Out must be rejected
-   Registration tokens should be one-time or securely rotatable
-   Device registration must be validated server-side
-   API endpoints must have authentication and authorization
-   Rate limiting should be enabled for heartbeat and authentication
    endpoints

------------------------------------------------------------------------

## 12. PWA Features

Employee PWA:

``` text
┌─────────────────────────────┐
│        WORK PORTAL          │
├─────────────────────────────┤
│                             │
│ Rahim                       │
│ EMP-001                     │
│                             │
│       🟢 ACTIVE             │
│                             │
│ Clock In: 08:30 AM          │
│                             │
│       [ CLOCK OUT ]         │
│                             │
└─────────────────────────────┘
```

PWA can optionally be installed from Chrome/Edge using the browser's
"Install" feature.

Installation is not mandatory.

------------------------------------------------------------------------

## 13. Admin Menu

``` text
WORKFORCE
│
├── Live Status
├── Employees
├── Attendance
├── Sessions
└── Settings
```

### Live Status

Show summary:

``` text
🟢 ACTIVE       18
🔴 NOT ACTIVE    4
⚪ NOT CLOCKED   3
```

------------------------------------------------------------------------

## 14. Technology Stack

### Frontend

-   React or Next.js
-   PWA support
-   Service Worker
-   Responsive desktop UI

### Backend

-   Node.js
-   Express
-   REST API
-   WebSocket / Socket.IO

### Database

Use the existing project database.

SQLite can be used for a local-first deployment, or MySQL/PostgreSQL for
a centralized deployment.

### Authentication

-   Secure session or JWT-based authentication
-   Employee-specific access control
-   Device registration

------------------------------------------------------------------------

## 15. Development Phases

### Phase 1 --- Core

-   Employee management
-   Authentication
-   Clock In
-   Clock Out
-   Work sessions
-   ACTIVE / NOT ACTIVE status

### Phase 2 --- PWA

-   PWA manifest
-   Service worker
-   Installable desktop experience
-   PC-only access rules
-   Device registration

### Phase 3 --- Presence

-   30-second heartbeat
-   90-second timeout
-   Automatic ACTIVE / NOT ACTIVE state
-   WebSocket live updates

### Phase 4 --- Dashboard

-   Live employee list
-   Employee status counters
-   Last seen
-   Daily sessions
-   Attendance history

### Phase 5 --- Reports

-   Daily attendance
-   Clock In / Clock Out history
-   Active/Inactive timeline
-   Monthly summary

### Phase 6 --- Security Hardening

-   Device binding
-   Token security
-   Rate limiting
-   Session protection
-   Audit logs
-   Abuse prevention

------------------------------------------------------------------------

## 16. Final Employee Experience

### Morning

``` text
Open Work PWA
      ↓
Clock In
      ↓
🟢 ACTIVE
```

### During Work

``` text
PWA automatically sends heartbeat
      ↓
No manual action required
```

### If PWA/browser stops communicating

``` text
Heartbeat stops
      ↓
~90 seconds
      ↓
🔴 NOT ACTIVE
```

### End of Work

``` text
Clock Out
      ↓
Session closed
```

------------------------------------------------------------------------

## 17. Important Scope Boundary

This system is intentionally limited to **work presence**.

It does NOT monitor:

-   Keyboard activity
-   Mouse activity
-   Screen content
-   Personal files
-   Browser history
-   Personal mobile data
-   Camera
-   Microphone
-   Keystrokes

The system's purpose is simply:

> **Clock In → determine ACTIVE/NOT ACTIVE → Clock Out**

------------------------------------------------------------------------

## 18. Final Architecture Decision

The first version should use:

``` text
PC-only PWA
      +
Backend API
      +
Heartbeat
      +
WebSocket
      +
Database
```

No Windows Agent is required for Version 1.

If stronger PC-level verification is needed later, a Windows Agent can
be introduced as an optional Version 2 component.


---

## 19. Fixed Night Shift Schedule

The system will track employees only during the defined night shift.

### Shift

```text
Start: 08:30 PM
End:   04:30 AM (next calendar day)
```

The shift therefore crosses midnight.

Example:

```text
Work Date: August 5

08:30 PM Aug 5
       ↓
       TRACKING
       ↓
12:30 AM Aug 6
       ↓
       BREAK — NO TRACKING
       ↓
01:00 AM Aug 6
       ↓
       TRACKING
       ↓
04:30 AM Aug 6
       ↓
       SHIFT ENDED
```

The system must treat `08:30 PM → 04:30 AM` as **one work session**, not two separate calendar days.

---

## 20. Fixed 30-Minute Break

The scheduled break is:

```text
12:30 AM → 01:00 AM
```

During this exact period, presence tracking is suspended.

```text
12:29:59 AM  → TRACKING
12:30:00 AM  → BREAK / NO TRACKING
01:00:00 AM  → TRACKING RESUMES
```

The employee will not be marked `NOT ACTIVE` because of missing heartbeats during the scheduled break.

The break should also be excluded from tracked working presence calculations.

---

## 21. Tracking Window

The system should only process presence during:

```text
08:30 PM → 12:30 AM
01:00 AM → 04:30 AM
```

Outside these periods:

```text
04:30 AM → 08:30 PM
```

the employee's PWA heartbeat must not be treated as work presence.

No inactive/absence event should be generated outside the scheduled shift.

---

## 22. Automatic Leave Rule

If an employee does not Clock In at all during the scheduled work shift, the system should automatically record the day as:

```text
AUTO LEAVE
```

Example:

```text
Employee: Rahim
Shift: 08:30 PM → 04:30 AM

No Clock In
        ↓
Shift ends at 04:30 AM
        ↓
Attendance = AUTO LEAVE
```

The system should not mark the employee as `NOT ACTIVE` for the entire shift if they never logged in. Instead, it should create a single attendance result:

> `AUTO LEAVE`

This rule should run automatically after the shift closes.

---

## 23. Late Login Handling

If an employee logs in after 08:30 PM, the system should record the actual Clock In time.

Example:

```text
Scheduled: 08:30 PM
Actual:    09:05 PM

Clock In: 09:05 PM
```

The employee is then tracked from the actual Clock In time until the scheduled break, resumes after the break, and remains trackable until 04:30 AM.

If late-login/late-hours deductions are needed later, that can be added separately.

---

## 24. Daily Attendance State

Each employee should have one final attendance state for the shift:

```text
PRESENT
LATE
AUTO LEAVE
```

During a logged-in shift, presence status is separately:

```text
🟢 ACTIVE
🔴 NOT ACTIVE
```

Example:

```text
Employee: Rahim

Attendance: PRESENT

08:30 PM ───────── 12:30 AM
   🟢 ACTIVE / 🔴 NOT ACTIVE

12:30 AM ───────── 01:00 AM
   ☕ BREAK — NO TRACKING

01:00 AM ───────── 04:30 AM
   🟢 ACTIVE / 🔴 NOT ACTIVE
```

---

## 25. Overnight Shift Date Rule

Because the shift crosses midnight, the attendance record must have a dedicated `work_date`.

Example:

```text
work_date = 2026-08-05

Clock In  = 2026-08-05 20:30
Break     = 2026-08-06 00:30–01:00
Clock Out = 2026-08-06 04:30
```

The entire session remains attached to:

```text
Work Date: 2026-08-05
```

This prevents the 12:00 AM transition from incorrectly creating a new attendance day.

---

## 26. Updated Attendance Logic

```text
SHIFT START: 08:30 PM
        │
        ├── No Clock In
        │       ↓
        │   Wait until shift ends
        │       ↓
        │   AUTO LEAVE
        │
        └── Clock In
                ↓
            Track Presence
                ↓
        12:30 AM → 01:00 AM
                ↓
          BREAK / NO TRACKING
                ↓
            Tracking resumes
                ↓
            04:30 AM
                ↓
            Shift closes
```

---

## 27. Updated Database Fields

`work_sessions` should include:

```text
id
employee_id
work_date
scheduled_start
scheduled_end
break_start
break_end
clock_in
clock_out
attendance_status
presence_status
last_seen
created_at
```

Recommended attendance values:

```text
PRESENT
LATE
AUTO_LEAVE
```

Recommended presence values:

```text
ACTIVE
NOT_ACTIVE
BREAK
OFF_SHIFT
```

---

## 28. Important Implementation Rule

The backend must be the source of truth for:

- Shift schedule
- Break schedule
- Work date
- Auto-leave calculation
- Presence timeout

Do not rely on the employee's browser clock for attendance calculations.

The server should calculate all schedule boundaries using the company's configured timezone.

---

## 29. Final Requirement Summary

```text
WORK SHIFT
08:30 PM → 04:30 AM

TRACKING
08:30 PM → 12:30 AM
01:00 AM → 04:30 AM

BREAK
12:30 AM → 01:00 AM
NO TRACKING

NO LOGIN
→ AUTO LEAVE

LOGIN
→ PRESENT / LATE

DURING TRACKING
→ ACTIVE / NOT ACTIVE

OUTSIDE SHIFT
→ NO TRACKING
```
