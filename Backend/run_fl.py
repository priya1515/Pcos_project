"""
run_fl.py — Launches fl_server.py + all 3 fl_client.py processes.
Writes every child PID to fl_pids.json so /federated/stop can kill them.
"""

import argparse
import json
import subprocess
import sys
import os
import time
import threading
import re
from datetime import datetime

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PYTHON      = sys.executable
_log_lock = threading.Lock()
_ANSI_ESCAPE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")
_NOISY_OUTPUT = (
    "DEPRECATED FEATURE:", "start_numpy_client() is deprecated", "start_client() is deprecated",
    "flower-supernode", "This is a deprecated feature.", "It will be removed",
    "Instead, use `flwr.client", "To view all available options", "server_address='<IP>:<PORT>'",
    "client=FlowerClient()", "warnings.warn(", "UserWarning:", "does not have valid feature names",
)


def append_log(log_file: str, source: str, message: str):
    """Keep a bounded activity feed that FastAPI can return to the UI."""
    with _log_lock:
        try:
            entries = []
            if os.path.exists(log_file):
                with open(log_file, encoding="utf-8") as file:
                    entries = json.load(file)
            entries.append({"timestamp": datetime.utcnow().isoformat(), "source": source, "message": message.strip()})
            with open(log_file, "w", encoding="utf-8") as file:
                json.dump(entries[-250:], file, indent=2)
        except (OSError, json.JSONDecodeError):
            pass


def relay_output(process: subprocess.Popen, source: str, log_file: str):
    if process.stdout is None:
        return
    for line in process.stdout:
        message = _ANSI_ESCAPE.sub("", line).strip()
        # The dashboard should show training progress, not library migration
        # notices or terminal colour control sequences.
        if message.startswith(f"[{source}]"):
            message = message[len(source) + 2:].strip()
        if message and not any(noise in message for noise in _NOISY_OUTPUT):
            append_log(log_file, source, message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds",      type=int, default=10)
    parser.add_argument("--epochs",      type=int, default=3)
    parser.add_argument("--min_clients", type=int, default=3)
    parser.add_argument("--port",        type=int, default=8080)
    parser.add_argument("--pids_file",   default=os.path.join(_BACKEND_DIR, "fl_pids.json"))
    parser.add_argument("--data_hash",   default="")
    parser.add_argument("--log_file",    default=os.path.join(_BACKEND_DIR, "fl_live_log.json"))
    args = parser.parse_args()

    server_cmd = [
        _PYTHON, "-u", os.path.join(_BACKEND_DIR, "fl_server.py"),
        "--rounds",      str(args.rounds),
        "--min_clients", str(args.min_clients),
        "--port",        str(args.port),
    ]
    client_cmd = lambda h: [
        _PYTHON, "-u", os.path.join(_BACKEND_DIR, "fl_client.py"),
        "--hospital", h,
        "--epochs",   str(args.epochs),
        "--server",   f"localhost:{args.port}",
    ]

    print(f"[run_fl] Starting FL — {args.rounds} rounds, {args.epochs} epochs/client\n")

    with open(args.log_file, "w", encoding="utf-8") as file:
        json.dump([], file)
    append_log(args.log_file, "orchestrator", f"Starting FL: {args.rounds} rounds, {args.epochs} local epochs per hospital.")

    server_proc = subprocess.Popen(server_cmd, cwd=_BACKEND_DIR, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
    threading.Thread(target=relay_output, args=(server_proc, "server", args.log_file), daemon=True).start()
    time.sleep(3)

    hospitals    = ["hospital_a", "hospital_b", "hospital_c"]
    client_procs = []
    for hospital in hospitals:
        process = subprocess.Popen(client_cmd(hospital), cwd=_BACKEND_DIR, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
        client_procs.append(process)
        threading.Thread(target=relay_output, args=(process, hospital, args.log_file), daemon=True).start()
        append_log(args.log_file, hospital, "Local training process started.")

    # write all child PIDs so /federated/stop can kill them by PID
    all_pids = [server_proc.pid] + [p.pid for p in client_procs]
    with open(args.pids_file, "w") as f:
        json.dump(all_pids, f)

    # store data hash in fl_metrics.json so next run can compare
    fl_metrics_path = os.path.join(_BACKEND_DIR, "fl_metrics.json")
    if args.data_hash and os.path.exists(fl_metrics_path):
        try:
            with open(fl_metrics_path) as f:
                m = json.load(f)
            m["data_hash"] = args.data_hash
            with open(fl_metrics_path, "w") as f:
                json.dump(m, f, indent=2)
        except Exception:
            pass

    print(f"[run_fl] PIDs: server={server_proc.pid}  "
          + "  ".join(f"{h}={p.pid}" for h, p in zip(hospitals, client_procs)))
    print("[run_fl] Waiting for all processes to finish...\n")

    for p in client_procs:
        p.wait()
    server_proc.wait()

    append_log(args.log_file, "orchestrator", "FL session complete.")

    # clean up PID file when done naturally
    if os.path.exists(args.pids_file):
        os.remove(args.pids_file)

    print("\n[run_fl] FL session complete.")


if __name__ == "__main__":
    main()
