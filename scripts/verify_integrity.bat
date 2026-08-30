@echo off
REM ===========================================================================
REM  verify_integrity.bat — SmartBus Post-Recovery Integrity Checker
REM  Mirrors: ./scripts/verify_integrity.sh from the_blackout_system_plan.md §11
REM
REM  Checks audit log for any failed operations after recovery.
REM  Usage:  scripts\verify_integrity.bat
REM ===========================================================================

setlocal
set API=http://localhost:8000/api/simulation/blackout

echo.
echo ===============================================
echo   SmartBus Recovery Integrity Verification
echo   plan §7 — Data Integrity Guarantees
echo ===============================================
echo.

echo [1/3] Fetching blackout status...
curl -s "%API%/status"
echo.
echo.

echo [2/3] Fetching audit log (immutable event trail)...
curl -s "%API%/audit-log"
echo.
echo.

echo [3/3] Checking DB health...
curl -s -X POST "%API%/health-check"
echo.
echo.

echo ===============================================
echo   Integrity check complete.
echo   Review "recovery_failed" above.
echo   If 0 — all records recovered. System clean.
echo   If >0 — check audit-log for lost operations.
echo ===============================================
echo.

endlocal
