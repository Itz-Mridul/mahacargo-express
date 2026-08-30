# The Blackout — System Flow & Recovery Plan

> **Challenge:** Primary data store corrupts or wipes mid-operation. People still using system. Some data recoverable, some not. Show live recovery — not a future plan.

---

## 1. What We're Protecting

| Layer | Data | Criticality |
|---|---|---|
| Primary DB | Farmer advisories, transaction logs, sensor readings | HIGH |
| In-flight ops | Requests mid-write at time of corruption | CRITICAL |
| Session state | Active user sessions, pending forms | MEDIUM |
| Audit trail | Who did what, when | HIGH |

---

## 2. How Corruption Happens (Scenario Map)

```
Normal Write Flow:
  User action  ──►  API  ──►  DB write  ──►  ACK

Blackout Scenarios:
  A. DB crashes BEFORE write confirms   → data lost, user got no error
  B. DB crashes DURING write           → partial record, corrupted row
  C. DB crashes AFTER write            → data ok, but indexes broken
  D. Storage wipe (full)               → everything gone, start from WAL
```

---

## 3. Defense Architecture (Pre-Blackout)

These must exist BEFORE demo day. No retroactive saves.

```
┌─────────────────────────────────────────────────┐
│                  WRITE PATH                     │
│                                                 │
│  Client ──► API ──► Write-Ahead Log (WAL)       │
│                         │                       │
│                         ├──► Primary DB         │
│                         │                       │
│                         └──► Event Queue        │
│                               (Kafka/Redis)     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              REDUNDANCY LAYER                   │
│                                                 │
│  Primary DB ──► Replica DB (streaming sync)     │
│                                                 │
│  Snapshots: every 15 min  ──► Cold storage      │
│  WAL:       continuous    ──► Append-only log   │
└─────────────────────────────────────────────────┘
```

**Key principle:** WAL writes FIRST. DB write SECOND. If DB dies, WAL survives.

---

## 4. Detection — Know Before Users Scream

```
Health Check Loop (every 5s):
  ┌─────────────────────────────────────┐
  │  ping DB                            │
  │  if no response in 2s:             │
  │    → flag: DB_UNREACHABLE          │
  │  if response but read fails:        │
  │    → flag: DB_CORRUPTED            │
  │  if partial rows detected:          │
  │    → flag: PARTIAL_CORRUPTION      │
  └─────────────────────────────────────┘

Triggers:
  - Checksum mismatch on critical tables
  - Row count delta > threshold vs last snapshot
  - Write latency spike > 3x baseline
  - Exception rate > 5% in 30s window
```

---

## 5. Live Recovery Flow (What Demo Must Show)

### Phase 0 — Blackout Hits
```
T+0s   DB goes down / corruption detected
T+2s   Health monitor fires alert
T+3s   System auto-switches to READ-ONLY mode
T+3s   Banner shown to active users: "Maintenance in progress"
T+4s   All new writes → queued in Redis / event log
```

### Phase 1 — Triage (T+0 to T+30s)
```
  ┌──────────────────────────────────────────┐
  │  AUTOMATED TRIAGE                        │
  │                                          │
  │  1. Determine corruption type            │
  │     - Full wipe? → go to Phase 2A       │
  │     - Partial? → go to Phase 2B         │
  │     - Index only? → go to Phase 2C      │
  │                                          │
  │  2. Identify last clean checkpoint       │
  │     - Pull latest snapshot timestamp     │
  │     - Scan WAL from that point forward   │
  │                                          │
  │  3. Calculate data gap                   │
  │     - Records between snapshot & crash   │
  │     - Flag in-flight transactions        │
  └──────────────────────────────────────────┘
```

### Phase 2A — Full Wipe Recovery
```
  Restore from last snapshot (cold storage)
       │
       ▼
  Replay WAL entries on top of snapshot
       │
       ▼
  Reconcile queued writes (from Redis)
       │
       ▼
  Identify unrecoverable gap (if WAL incomplete)
       │
       ▼
  Notify affected users with exact data gap window
```

### Phase 2B — Partial Corruption Recovery
```
  Identify corrupted rows (checksum scan)
       │
       ▼
  Quarantine corrupted rows → corruption_log table
       │
       ▼
  Pull clean versions from replica or snapshot
       │
       ▼
  Patch in-place where possible
       │
       ▼
  Flag unrecoverable rows in audit table
```

### Phase 2C — Index-Only Corruption
```
  Drop broken indexes
       │
       ▼
  Rebuild from existing data (REINDEX)
       │
       ▼
  Validate rebuilt indexes
       │
       ▼
  Resume normal operations
       │
       ▼
  Total downtime: < 2 min
```

### Phase 3 — Resume + User Communication
```
  Flush queued writes → DB (replay in order)
       │
       ▼
  Validate each replayed write (checksum match)
       │
       ▼
  Exit READ-ONLY mode
       │
       ▼
  Active users notified: system restored
       │
       ▼
  Users with data loss notified individually:
    "Your record from [TIME] may be incomplete.
     Affected fields: [X, Y]. Please review."
```

---

## 6. What the Demo Must Show Live

| Moment | What Happens on Screen |
|---|---|
| Corruption triggered | Red banner: "Data store anomaly detected" |
| Auto-triage runs | Live log: corruption type, last clean checkpoint |
| Recovery starts | Progress bar: "Restoring from snapshot T-14:32" |
| WAL replay | Counter: "Replaying 47 events..." |
| Gap identified | Table: "3 records unrecoverable (T+14:41 to T+14:43)" |
| System resumes | Green banner: "System restored. 44/47 records recovered." |
| User notification | Toast per affected user: "Your data from 2:41 PM is incomplete" |

**Do NOT show:** a loading spinner and then "everything fine." Show the gap. Show what's lost. Show the decision.

---

## 7. Data Integrity Guarantees Post-Recovery

```
RECOVERED data:   Checksum validated ✓
REPLAYED writes:  Idempotency keys prevent duplicates ✓
LOST data:        Logged in audit table with reason ✓
IN-FLIGHT ops:    Retried via queue, or rejected with user notice ✓
```

---

## 8. Tech Stack (Implementation)

```
Detection:       Health check service (Node/Python, cron or loop)
WAL:             PostgreSQL WAL  OR  custom append-only file
Event Queue:     Redis Streams or Kafka (in-flight write buffer)
Replica:         PostgreSQL streaming replication  OR  read replica
Snapshots:       pg_dump cron  OR  filesystem snapshot (LVM/ZFS)
Notification:    WebSocket push to active sessions
Audit Log:       Immutable append-only table (no UPDATE/DELETE allowed)
```

---

## 9. Failure Modes to Demonstrate

| Scenario | System Response |
|---|---|
| WAL also corrupted | Fall back to last snapshot only. Show honest gap. |
| Replica lagging | Show replica lag warning. Use snapshot instead. |
| Queue overflow | Drop oldest queued writes first. Log dropped items. |
| Replica also gone | Full restore from cold storage. Longer downtime, honest ETA shown. |

---

## 10. Key Design Principles

1. **Honesty over optimism.** Show users exactly what's lost, not "an error occurred."
2. **WAL is sacred.** It writes before DB. It's the single source of recovery truth.
3. **Idempotent writes.** Every write has a unique key. Replay is safe.
4. **Queued, never dropped.** Writes during blackout queue, never silently fail.
5. **Audit everything.** Recovery actions logged. Unrecoverable data logged. No silent losses.
6. **READ-ONLY bridge.** Users can still read during recovery. No full blackout UX.

---

## 11. Demo Trigger Script (For Judges)

```bash
# Simulate corruption
./scripts/corrupt_db.sh --mode partial    # partial row corruption
./scripts/corrupt_db.sh --mode full-wipe  # full wipe scenario
./scripts/corrupt_db.sh --mode index-only # index corruption only

# Watch recovery
./scripts/watch_recovery.sh               # live log output

# Verify integrity post-recovery
./scripts/verify_integrity.sh             # checksum all recovered rows
```

---

*Plan version: 1.0 | Challenge: The Blackout | Status: Demo-ready*
