"""
Blackout simulation, detection, WAL, and recovery engine.
Implements the full plan from the_blackout_system_plan.md.
"""
from fastapi import APIRouter, BackgroundTasks
from typing import Dict, List, Any, Optional
import asyncio
from datetime import datetime, timezone

router = APIRouter(prefix="/api/simulation/blackout", tags=["simulation", "blackout"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class BlackoutManager:
    """
    Core engine for the blackout resilience layer.

    READ PATH:  When is_active, all DB reads are served from read_cache
                (populated on every successful real DB read pre-blackout).

    WRITE PATH: When is_active, all DB writes are enqueued in wal_queue
                instead of being sent to Supabase. Callers receive an
                optimistic response so users see no error.

    RECOVERY:   recover() replays wal_queue to Supabase in order.
                Failed operations are tracked in audit_log.

    DETECTION:  health_check() pings the DB and auto-activates blackout
                with a typed corruption flag (full_wipe, partial, index_only).
    """

    def __init__(self):
        self.is_active: bool = False
        self.corruption_type: Optional[str] = None  # full_wipe | partial | index_only | manual
        self.blackout_started_at: Optional[str] = None
        self.last_clean_checkpoint: Optional[str] = _now()   # last known-good DB state

        self.read_cache: Dict[str, Any] = {}
        self.wal_queue: List[Dict[str, Any]] = []
        self.wal_sequence: int = 0                 # monotonic counter for ordering

        self.is_recovering: bool = False
        self.recovery_total: int = 0               # WAL ops attempted in last recovery
        self.recovery_succeeded: int = 0
        self.recovery_failed: int = 0
        self.recovery_finished_at: Optional[str] = None

        self.audit_log: List[Dict[str, Any]] = []  # immutable append-only recovery audit
        self.health_check_running: bool = False

    # ── Cache helpers ──────────────────────────────────────────────────────────

    def update_cache(self, key: str, data: Any):
        self.read_cache[key] = data
        self.last_clean_checkpoint = _now()

    def get_cache(self, key: str) -> Any:
        return self.read_cache.get(key)

    # ── Blackout toggle ────────────────────────────────────────────────────────

    def activate(self, corruption_type: str = "manual"):
        if not self.is_active:
            self.is_active = True
            self.corruption_type = corruption_type
            self.blackout_started_at = _now()
            self.wal_sequence = 0
            self.recovery_total = 0
            self.recovery_succeeded = 0
            self.recovery_failed = 0
            self.recovery_finished_at = None
            print(f"[Blackout] ACTIVATED — type={corruption_type}")
            self._append_audit("BLACKOUT_ACTIVATED", {"corruption_type": corruption_type})

    def deactivate(self):
        if self.is_active:
            self.is_active = False
            print("[Blackout] DEACTIVATED")
            self._append_audit("BLACKOUT_DEACTIVATED", {})

    # ── WAL helpers ────────────────────────────────────────────────────────────

    def enqueue_write(self, operation: str, payload: Any):
        self.wal_sequence += 1
        entry = {
            "seq": self.wal_sequence,
            "operation": operation,
            "payload": payload,
            "queued_at": _now(),
        }
        self.wal_queue.append(entry)
        print(f"[Blackout] WAL enqueued seq={self.wal_sequence} op={operation}")

    # ── Audit log ──────────────────────────────────────────────────────────────

    def _append_audit(self, event: str, detail: Dict):
        self.audit_log.append({"ts": _now(), "event": event, **detail})

    # ── Recovery ───────────────────────────────────────────────────────────────

    async def recover(self):
        """Replay all enqueued WAL operations to Supabase in order."""
        if self.is_recovering:
            return

        self.is_recovering = True
        self.is_active = False

        from app.db import supabase as db

        operations = list(self.wal_queue)
        self.wal_queue.clear()
        self.recovery_total = len(operations)
        self.recovery_succeeded = 0
        self.recovery_failed = 0

        print(f"[Blackout] Recovery starting — replaying {self.recovery_total} WAL operations")
        self._append_audit("RECOVERY_STARTED", {"total_ops": self.recovery_total})

        for item in operations:
            op = item["operation"]
            payload = item["payload"]
            seq = item["seq"]
            try:
                if op == "create_parcel":
                    await db.create_parcel(payload, _bypass_blackout=True)
                elif op == "update_parcel_status":
                    await db.update_parcel_status(
                        payload["parcel_id"],
                        payload["status"],
                        payload.get("bus_id"),
                        _bypass_blackout=True
                    )
                elif op == "create_assignment":
                    await db.create_assignment(payload, _bypass_blackout=True)
                elif op == "update_bus_position":
                    await db.update_bus_position(
                        payload["bus_id"],
                        payload["lat"],
                        payload["lng"],
                        payload["stop_index"],
                        _bypass_blackout=True
                    )
                elif op == "decrement_bus_capacity":
                    await db.decrement_bus_capacity(
                        payload["bus_id"],
                        payload["weight_kg"],
                        _bypass_blackout=True
                    )
                elif op == "restore_bus_capacity":
                    await db.restore_bus_capacity(
                        payload["bus_id"],
                        payload["weight_kg"],
                        _bypass_blackout=True
                    )
                self.recovery_succeeded += 1
                print(f"[Blackout] Recovered seq={seq} op={op}")
                self._append_audit("OP_RECOVERED", {"seq": seq, "op": op})
            except Exception as e:
                self.recovery_failed += 1
                print(f"[Blackout] FAILED to recover seq={seq} op={op}: {e}")
                self._append_audit("OP_FAILED", {
                    "seq": seq,
                    "op": op,
                    "error": str(e),
                    "payload": payload,
                })

        self.recovery_finished_at = _now()
        self.is_recovering = False
        self.last_clean_checkpoint = _now()
        print(
            f"[Blackout] Recovery complete — "
            f"{self.recovery_succeeded}/{self.recovery_total} recovered, "
            f"{self.recovery_failed} lost"
        )
        self._append_audit("RECOVERY_COMPLETE", {
            "succeeded": self.recovery_succeeded,
            "failed": self.recovery_failed,
        })

    # ── Health check / auto-detection ─────────────────────────────────────────

    async def health_check(self) -> Dict:
        """
        Ping the DB and classify corruption type.
        Mirrors plan §4 detection logic.
        Returns a typed status dict.
        """
        from app.db.supabase import get_db
        result = {
            "db_reachable": False,
            "read_ok": False,
            "flag": None,
            "checked_at": _now(),
        }
        try:
            db = get_db()
            # lightweight ping — count buses
            res = db.table("buses").select("id", count="exact").limit(1).execute()
            result["db_reachable"] = True
            result["read_ok"] = True
            result["flag"] = "HEALTHY"
            # If we were in auto-detected blackout, auto-recover
            if self.is_active and self.corruption_type != "manual":
                asyncio.create_task(self.recover())
        except Exception as e:
            err = str(e).lower()
            if "connection" in err or "timeout" in err or "unreachable" in err:
                result["flag"] = "DB_UNREACHABLE"
            elif "corrupted" in err or "invalid" in err or "checksum" in err:
                result["flag"] = "DB_CORRUPTED"
            else:
                result["flag"] = "DB_UNREACHABLE"  # safe default
            result["error"] = str(e)

            if not self.is_active:
                self.activate(corruption_type=result["flag"])

        return result


# ── Singleton ──────────────────────────────────────────────────────────────────

manager = BlackoutManager()


# ── Background health check loop ──────────────────────────────────────────────

async def _health_check_loop():
    """Plan §4: Health check every 5s, auto-activates blackout on failure."""
    manager.health_check_running = True
    while manager.health_check_running:
        await asyncio.sleep(5)
        try:
            await manager.health_check()
        except Exception as e:
            print(f"[Blackout] Health check loop error: {e}")


def start_health_check_task():
    """Call this from the app lifespan to begin the health check loop."""
    asyncio.create_task(_health_check_loop())


# ── API endpoints ──────────────────────────────────────────────────────────────


@router.post("/toggle")
async def toggle_blackout(active: bool, mode: str = "manual"):
    """
    Manually trigger or stop a blackout.
    mode: manual | full_wipe | partial | index_only
    """
    if active:
        manager.activate(corruption_type=mode)
    else:
        manager.deactivate()
    return {
        "status": "ok",
        "blackout_active": manager.is_active,
        "corruption_type": manager.corruption_type,
    }


@router.post("/recover")
async def recover_blackout(background_tasks: BackgroundTasks):
    """Start WAL replay to Supabase in background."""
    if manager.is_recovering:
        return {"status": "already_recovering"}
    manager.deactivate()
    background_tasks.add_task(manager.recover)
    return {
        "status": "ok",
        "message": "Recovery started",
        "wal_ops_queued": manager.recovery_total or len(manager.wal_queue),
    }


@router.get("/status")
async def blackout_status():
    """
    Full system status — used by frontend every 2s.
    """
    return {
        "blackout_active": manager.is_active,
        "corruption_type": manager.corruption_type,
        "blackout_started_at": manager.blackout_started_at,
        "last_clean_checkpoint": manager.last_clean_checkpoint,
        "wal_queue_size": len(manager.wal_queue),
        "is_recovering": manager.is_recovering,
        "recovery_total": manager.recovery_total,
        "recovery_succeeded": manager.recovery_succeeded,
        "recovery_failed": manager.recovery_failed,
        "recovery_finished_at": manager.recovery_finished_at,
    }


@router.get("/audit-log")
async def get_audit_log():
    """Immutable audit trail of all blackout events."""
    return {"events": manager.audit_log}


@router.post("/health-check")
async def manual_health_check():
    """Manually trigger a DB health check (plan §4)."""
    result = await manager.health_check()
    return result
