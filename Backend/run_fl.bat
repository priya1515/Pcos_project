@echo off
REM ============================================================
REM  run_fl.bat  --  Full Federated Learning Pipeline
REM  Run from: Backend\
REM ============================================================

echo.
echo ============================================================
echo  PCOS Federated Learning Pipeline
echo ============================================================
echo.

REM -- Step 1: Prepare image data splits -----------------------
echo [1/5] Splitting image dataset into hospital partitions...
python split_dataset.py --data_dir ./data --output_dir ./data/federated --splits 3
if errorlevel 1 ( echo ERROR in split_dataset.py & pause & exit /b 1 )

REM -- Step 2: Prepare clinical data splits --------------------
echo.
echo [2/5] Splitting clinical data into hospital partitions...
python split_clinical.py
if errorlevel 1 ( echo ERROR in split_clinical.py & pause & exit /b 1 )

REM ── Step 3: Start FL server in background ───────────────────
echo.
echo [3/5] Starting FL server (port 8080, 10 rounds, 3 clients)...
start "FL Server" cmd /k "python fl_server.py --rounds 10 --min_clients 3 --port 8080"
timeout /t 4 /nobreak >nul

REM ── Step 4: Start 3 hospital clients ────────────────────────
echo.
echo [4/5] Starting hospital clients...
start "Hospital A" cmd /k "python fl_client.py --hospital hospital_a --epochs 3"
timeout /t 2 /nobreak >nul
start "Hospital B" cmd /k "python fl_client.py --hospital hospital_b --epochs 3"
timeout /t 2 /nobreak >nul
start "Hospital C" cmd /k "python fl_client.py --hospital hospital_c --epochs 3"

echo.
echo  All 3 hospital clients started.
echo  Watch the FL Server window for round progress.
echo  fl_metrics.json is updated after each round.
echo.
echo  When training completes, run Step 5:
echo    python fl_evaluate.py
echo.
pause
