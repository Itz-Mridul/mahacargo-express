@echo off
REM ===========================================================================
REM  corrupt_db.bat  —  SmartBus Blackout Demo Trigger
REM  Mirrors: ./scripts/corrupt_db.sh from the_blackout_system_plan.md §11
REM
REM  Usage:
REM    scripts\corrupt_db.bat --mode partial
REM    scripts\corrupt_db.bat --mode full-wipe
REM    scripts\corrupt_db.bat --mode index-only
REM    scripts\corrupt_db.bat --mode manual
REM ===========================================================================

setlocal

set MODE=manual
set API=http://localhost:8000/api/simulation/blackout

:parse_args
if "%~1"=="--mode" (
  set MODE=%~2
  shift
  shift
  goto parse_args
)
if not "%~1"=="" (
  shift
  goto parse_args
)

REM Normalize mode for API (full-wipe -> full_wipe)
if "%MODE%"=="full-wipe" set MODE=full_wipe
if "%MODE%"=="index-only" set MODE=index_only

echo.
echo [Blackout] Triggering corruption: mode=%MODE%
echo [Blackout] Scenario:

if "%MODE%"=="full_wipe" (
  echo    D. Storage wipe - everything gone, starting from WAL
) else if "%MODE%"=="partial" (
  echo    B. DB crashed DURING write - partial record / corrupted rows
) else if "%MODE%"=="index_only" (
  echo    C. DB crashed AFTER write - data ok but indexes broken
) else (
  echo    A. Manual trigger - simulated DB unreachable
)

echo.
echo [Blackout] Calling: POST %API%/toggle?active=true^&mode=%MODE%
echo.

curl -s -X POST "%API%/toggle?active=true&mode=%MODE%" -H "accept: application/json" | findstr /C:"blackout_active" /C:"corruption_type"

echo.
echo [Blackout] Done. System is now in degraded mode.
echo [Blackout] Run: scripts\watch_recovery.bat   to monitor live
echo [Blackout] Run: scripts\corrupt_db.bat --recover   to recover
echo.

endlocal
