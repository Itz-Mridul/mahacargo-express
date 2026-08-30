@echo off
REM ===========================================================================
REM  watch_recovery.bat — SmartBus Blackout Live Monitor
REM  Mirrors: ./scripts/watch_recovery.sh from the_blackout_system_plan.md §11
REM
REM  Polls /blackout/status every 2s and prints a live dashboard.
REM  Press Ctrl+C to stop.
REM ===========================================================================

setlocal
set API=http://localhost:8000/api/simulation/blackout/status

echo.
echo ===============================================
echo   SmartBus Blackout Live Monitor
echo   Polling: %API%
echo   Press Ctrl+C to stop
echo ===============================================
echo.

:loop
cls
echo =================== BLACKOUT STATUS ===================
echo   Time: %TIME%
echo.

curl -s "%API%" > "%TEMP%\bk_status.json" 2>nul

REM Parse and display key fields
for /f "tokens=2 delims=:," %%a in ('findstr "blackout_active" "%TEMP%\bk_status.json"') do (
  set ACTIVE=%%a
)
for /f "tokens=2 delims=:," %%a in ('findstr "wal_queue_size" "%TEMP%\bk_status.json"') do (
  set WAL=%%a
)
for /f "tokens=2 delims=:," %%a in ('findstr "is_recovering" "%TEMP%\bk_status.json"') do (
  set RECOVERING=%%a
)
for /f "tokens=2 delims=:," %%a in ('findstr "recovery_total" "%TEMP%\bk_status.json"') do (
  set TOTAL=%%a
)
for /f "tokens=2 delims=:," %%a in ('findstr "recovery_succeeded" "%TEMP%\bk_status.json"') do (
  set OK=%%a
)
for /f "tokens=2 delims=:," %%a in ('findstr "recovery_failed" "%TEMP%\bk_status.json"') do (
  set FAIL=%%a
)

echo   DB Status    : %ACTIVE%
echo   WAL Queue    : %WAL% ops pending
echo   Recovering   : %RECOVERING%
echo   Total Ops    : %TOTAL%
echo   Recovered    : %OK%
echo   Lost         : %FAIL%
echo.
echo -------------------------------------------------------
echo   Full JSON:
type "%TEMP%\bk_status.json"
echo.
echo -------------------------------------------------------
echo   Commands:
echo     Trigger:  curl -X POST "%API:status=toggle%?active=true^&mode=full_wipe"
echo     Recover:  curl -X POST "%API:status=recover%"
echo     Audit:    curl "%API:status=audit-log%"
echo -------------------------------------------------------

timeout /t 2 /nobreak >nul
goto loop

endlocal
