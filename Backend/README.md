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

.venv\Scripts\uvicorn.exe api.main:app --host 127.0.0.1 --port 8000 --reload

