cd backend

//venv create command
python -m venv .venv

//venv activate command
.\.venv\Scripts\Activate.ps1

//dependencies install command
pip install -r requirements.txt

//start command
uvicorn api.main:app --reload

venv activate command + start command = to Run the application

.venv\Scripts\uvicorn.exe api.main:app --host 127.0.0.1 --port 8001 --reload

Manual federated learning (run from the Backend folder):

Terminal 1 - FL server:
.venv\Scripts\python.exe fl_server.py --rounds 10 --min_clients 3 --port 8080

Terminal 2 - Hospital A:
.venv\Scripts\python.exe fl_client.py --hospital hospital_a --epochs 3 --server localhost:8080

Terminal 3 - Hospital B:
.venv\Scripts\python.exe fl_client.py --hospital hospital_b --epochs 3 --server localhost:8080

Terminal 4 - Hospital C:
.venv\Scripts\python.exe fl_client.py --hospital hospital_c --epochs 3 --server localhost:8080

Do not start these manual commands while dashboard-driven FL training is running, because both use port 8080.
