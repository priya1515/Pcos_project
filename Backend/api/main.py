import io
import sys
import os
import json
import base64
import subprocess
import threading
import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from PIL import Image
from model import get_model
from dataset import get_transforms

# Allow importing from parent Backend/ directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _BACKEND_DIR)
from clinical_model import predict_clinical, selected_features
from fusion import fuse_predictions

app = FastAPI(
    title="FemWell PCOS Detection API",
    description="PCOS detection via ultrasound image and clinical data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLASS_NAMES = ["normal", "pcos"]
_IMAGE_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "image", "best_model.pth")

# Load image model once at startup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
image_model = get_model(num_classes=len(CLASS_NAMES))
image_model.load_state_dict(torch.load(_IMAGE_MODEL_PATH, map_location=device))
image_model = image_model.to(device)
image_model.eval()

transform = get_transforms(is_training=False)


# ── Grad-CAM ─────────────────────────────────────────────────────────────────

def generate_gradcam(pil_image: Image.Image, target_class_idx: int) -> str:
    """
    Grad-CAM on image_model.layer4.
    Uses register_full_backward_hook to capture gradients even when
    model weights are frozen (requires_grad=False).
    """
    input_tensor = transform(pil_image).unsqueeze(0).to(device)

    feat_map = {}
    grad_map = {}

    def fwd_hook(module, inp, out):
        feat_map["out"] = out

    def bwd_hook(module, grad_in, grad_out):
        grad_map["out"] = grad_out[0]

    fwd_handle = image_model.layer4.register_forward_hook(fwd_hook)
    bwd_handle = image_model.layer4.register_full_backward_hook(bwd_hook)

    image_model.zero_grad()
    with torch.enable_grad():
        # Re-run forward with grad enabled on input so graph is built
        inp = input_tensor.requires_grad_(True)
        logits = image_model(inp)
        score  = logits[0, target_class_idx]
        score.backward()

    fwd_handle.remove()
    bwd_handle.remove()
    image_model.zero_grad()

    feat = feat_map["out"].detach()                 # (1, C, H, W)
    grad = grad_map["out"].detach()                 # (1, C, H, W)

    weights = grad.mean(dim=(2, 3), keepdim=True)   # (1, C, 1, 1)
    cam = F.relu((weights * feat).sum(dim=1, keepdim=True))  # (1,1,H,W)
    cam = F.interpolate(cam, size=(224, 224), mode="bilinear", align_corners=False)
    cam = cam.squeeze().cpu().numpy()               # (224, 224)

    lo, hi = cam.min(), cam.max()
    cam = (cam - lo) / (hi - lo + 1e-8)

    # Jet colormap
    r = np.clip(1.5 - np.abs(cam * 4.0 - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(cam * 4.0 - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(cam * 4.0 - 1.0), 0.0, 1.0)
    heatmap = Image.fromarray(
        (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
    ).resize(pil_image.size, Image.BILINEAR)

    base    = pil_image.convert("RGB")
    overlay = Image.blend(base, heatmap, alpha=0.50)

    buf = io.BytesIO()
    overlay.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FemWell PCOS Classifier</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #0f172a;
            --panel: #111827;
            --card: #f8fafc;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --accent: #22c55e;
            --accent-2: #38bdf8;
            --border: #334155;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            min-height: 100vh;
            background:
                radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
                radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.16), transparent 30%),
                linear-gradient(180deg, #020617 0%, #0f172a 100%);
            color: var(--text);
            display: grid;
            place-items: center;
            padding: 24px;
        }

        .shell {
            width: min(920px, 100%);
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
        }

        .hero, .card {
            border: 1px solid rgba(148, 163, 184, 0.18);
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(18px);
            border-radius: 24px;
            box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
        }

        .hero { padding: 36px; }
        .card { padding: 28px; background: rgba(248, 250, 252, 0.96); color: #0f172a; }

        h1 {
            margin: 0 0 12px;
            font-size: clamp(2rem, 4vw, 3.5rem);
            line-height: 1.05;
            letter-spacing: -0.04em;
        }

        p { margin: 0 0 16px; line-height: 1.6; }

        .tag {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(56, 189, 248, 0.12);
            color: #7dd3fc;
            font-size: 0.9rem;
            margin-bottom: 18px;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
        }

        label {
            font-weight: 600;
            display: block;
            margin-bottom: 8px;
        }

        input[type="file"] {
            width: 100%;
            padding: 12px;
            border-radius: 14px;
            border: 1px dashed #94a3b8;
            background: #fff;
        }

        button {
            border: 0;
            border-radius: 14px;
            padding: 14px 18px;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            color: white;
            box-shadow: 0 12px 30px rgba(56, 189, 248, 0.24);
        }

        button:disabled { opacity: 0.65; cursor: wait; }

        .result {
            margin-top: 18px;
            padding: 16px;
            border-radius: 16px;
            background: #e2e8f0;
            white-space: pre-wrap;
            min-height: 72px;
        }

        .status {
            display: inline-block;
            margin-top: 16px;
            color: var(--muted);
            font-size: 0.95rem;
        }

        .details {
            display: grid;
            gap: 12px;
            margin-top: 18px;
        }

        .panel {
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            background: rgba(15, 23, 42, 0.45);
        }

        .panel strong { display: block; margin-bottom: 6px; }

        @media (max-width: 820px) {
            .shell { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <main class="shell">
        <section class="hero">
            <div class="tag">FemWell PCOS Ultrasound Classifier</div>
            <h1>Upload an ultrasound image and get a prediction instantly.</h1>
            <p>
                This interface sends the selected image to the FastAPI prediction endpoint and shows the model output
                directly in the browser.
            </p>
            <div class="details">
                <div class="panel">
                    <strong>API endpoint</strong>
                    <span>POST /predict</span>
                </div>
                <div class="panel">
                    <strong>Health check</strong>
                    <span>GET /health</span>
                </div>
                <div class="panel">
                    <strong>Model</strong>
                    <span>ResNet-50 PCOS classifier</span>
                </div>
            </div>
        </section>

        <section class="card">
            <form id="predict-form" class="grid">
                <div>
                    <label for="file">Ultrasound image</label>
                    <input id="file" name="file" type="file" accept="image/*" required />
                </div>
                <button id="submit-btn" type="submit">Run Prediction</button>
            </form>
            <div id="result" class="result">Prediction output will appear here.</div>
            <div class="status">Tip: open this page in the browser, not the API docs, if you want the UI.</div>
        </section>
    </main>

    <script>
        const form = document.getElementById('predict-form');
        const result = document.getElementById('result');
        const button = document.getElementById('submit-btn');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const fileInput = document.getElementById('file');
            if (!fileInput.files.length) {
                result.textContent = 'Please choose an image first.';
                return;
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            button.disabled = true;
            result.textContent = 'Analyzing image...';

            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.detail || 'Prediction request failed');
                }

                result.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = `Error: ${error.message}`;
            } finally {
                button.disabled = false;
            }
        });
    </script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def ui():
    return INDEX_HTML


@app.get("/health")
def health():
    return {"status": "ok", "model": "ResNet-50 PCOS Classifier"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts an ultrasound image and returns PCOS prediction.
    """
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    input_tensor = transform(image).unsqueeze(0).to(device)

    with torch.inference_mode():
        outputs = image_model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, predicted_idx = torch.max(probabilities, 0)

    prediction = CLASS_NAMES[predicted_idx.item()]
    # probabilities as fractions [0,1] — consistent with clinical endpoint
    probs = {cls: round(probabilities[i].item(), 4) for i, cls in enumerate(CLASS_NAMES)}

    return {
        "success": True,
        "prediction": prediction,
        "confidence": round(confidence.item() * 100, 2),
        "probabilities": probs,
        "pcos_probability": probs["pcos"],
        "normal_probability": probs["normal"],
    }


# ── Clinical prediction ──────────────────────────────────────────────────────

class ClinicalInput(BaseModel):
    age: float = Field(..., alias="Age (yrs)", description="Age in years")
    height: float = Field(..., alias="Height(Cm)", description="Height in cm")
    pulse_rate: float = Field(..., alias="Pulse rate(bpm)", description="Pulse rate in bpm")
    rbs: float = Field(..., alias="RBS(mg/dl)", description="Random blood sugar mg/dl")
    bp_systolic: float = Field(..., alias="BP _Systolic (mmHg)", description="Systolic BP mmHg")
    cycle_length: float = Field(..., alias="Cycle length(days)", description="Cycle length in days")
    lh: float = Field(..., alias="LH(mIU/mL)", description="LH mIU/mL")
    amh: float = Field(..., alias="AMH(ng/mL)", description="AMH ng/mL")
    prl: float = Field(..., alias="PRL(ng/mL)", description="Prolactin ng/mL")
    vit_d3: float = Field(..., alias="Vit D3 (ng/mL)", description="Vitamin D3 ng/mL")
    follicle_r: float = Field(..., alias="Follicle No. (R)", description="Follicle count right ovary")
    follicle_l: float = Field(..., alias="Follicle No. (L)", description="Follicle count left ovary")
    avg_f_size_r: float = Field(..., alias="Avg. F size (R) (mm)", description="Avg follicle size right mm")
    beta_hcg_1: float = Field(..., alias="I beta-HCG(mIU/mL)", description="Beta-HCG I mIU/mL")
    beta_hcg_2: float = Field(..., alias="II beta-HCG(mIU/mL)", description="Beta-HCG II mIU/mL")

    model_config = {"populate_by_name": True}

    def to_feature_dict(self) -> dict:
        return {
            "Age (yrs)": self.age,
            "Height(Cm)": self.height,
            "Pulse rate(bpm)": self.pulse_rate,
            "RBS(mg/dl)": self.rbs,
            "BP _Systolic (mmHg)": self.bp_systolic,
            "Cycle length(days)": self.cycle_length,
            "LH(mIU/mL)": self.lh,
            "AMH(ng/mL)": self.amh,
            "PRL(ng/mL)": self.prl,
            "Vit D3 (ng/mL)": self.vit_d3,
            "Follicle No. (R)": self.follicle_r,
            "Follicle No. (L)": self.follicle_l,
            "Avg. F size (R) (mm)": self.avg_f_size_r,
            "I beta-HCG(mIU/mL)": self.beta_hcg_1,
            "II beta-HCG(mIU/mL)": self.beta_hcg_2,
        }


@app.post("/predict/clinical", tags=["Clinical"])
def predict_clinical_endpoint(data: ClinicalInput):
    """
    Accepts 15 clinical features and returns PCOS prediction.

    Example body (use plain field names, not aliases):
    ```json
    {
      "Age (yrs)": 28,
      "Height(Cm)": 152,
      "Pulse rate(bpm)": 78,
      "RBS(mg/dl)": 92,
      "BP _Systolic (mmHg)": 110,
      "Cycle length(days)": 5,
      "LH(mIU/mL)": 3.68,
      "AMH(ng/mL)": 2.07,
      "PRL(ng/mL)": 45.16,
      "Vit D3 (ng/mL)": 17.1,
      "Follicle No. (R)": 3,
      "Follicle No. (L)": 3,
      "Avg. F size (R) (mm)": 18,
      "I beta-HCG(mIU/mL)": 1.99,
      "II beta-HCG(mIU/mL)": 1.99
    }
    ```
    """
    try:
        result = predict_clinical(data.to_feature_dict())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    return {
        "success": True,
        "prediction": result["prediction"],
        "pcos_probability": round(result["pcos_probability"], 4),
        "normal_probability": round(result["normal_probability"], 4),
        "threshold": result["threshold"],
    }


# ── Multimodal fusion endpoint ────────────────────────────────────────────────

@app.post("/predict/multimodal", tags=["Multimodal"])
async def predict_multimodal(
    file: UploadFile = File(...),
    age: float = Form(...),
    height: float = Form(...),
    pulse_rate: float = Form(...),
    rbs: float = Form(...),
    bp_systolic: float = Form(...),
    cycle_length: float = Form(...),
    lh: float = Form(...),
    amh: float = Form(...),
    prl: float = Form(...),
    vit_d3: float = Form(...),
    follicle_r: float = Form(...),
    follicle_l: float = Form(...),
    avg_f_size_r: float = Form(...),
    beta_hcg_1: float = Form(...),
    beta_hcg_2: float = Form(...),
):
    """
    Accepts an ultrasound image (multipart file) + 15 clinical features (form fields).
    Returns individual model predictions and a fused final prediction.
    """
    # ── Image branch ──
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        input_tensor = transform(pil_image).unsqueeze(0).to(device)

        with torch.inference_mode():
            outputs = image_model(input_tensor)
            img_probs = torch.nn.functional.softmax(outputs[0], dim=0)

        image_pcos_prob = img_probs[CLASS_NAMES.index("pcos")].item()
        target_idx = int(torch.argmax(img_probs).item())
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image processing failed: {e}")

    # ── Grad-CAM (uses already-loaded image_model, no reload) ──
    try:
        gradcam_b64 = generate_gradcam(pil_image, target_idx)
    except Exception:
        gradcam_b64 = None

    # ── Clinical branch ──
    clinical_data = {
        "Age (yrs)": age,
        "Height(Cm)": height,
        "Pulse rate(bpm)": pulse_rate,
        "RBS(mg/dl)": rbs,
        "BP _Systolic (mmHg)": bp_systolic,
        "Cycle length(days)": cycle_length,
        "LH(mIU/mL)": lh,
        "AMH(ng/mL)": amh,
        "PRL(ng/mL)": prl,
        "Vit D3 (ng/mL)": vit_d3,
        "Follicle No. (R)": follicle_r,
        "Follicle No. (L)": follicle_l,
        "Avg. F size (R) (mm)": avg_f_size_r,
        "I beta-HCG(mIU/mL)": beta_hcg_1,
        "II beta-HCG(mIU/mL)": beta_hcg_2,
    }

    try:
        clinical_result = predict_clinical(clinical_data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clinical prediction failed: {e}")

    clinical_pcos_prob = clinical_result["pcos_probability"]

    # ── Fusion ──
    fused = fuse_predictions(clinical_pcos_prob, image_pcos_prob)

    return {
        "success": True,
        "final": {
            "prediction": fused["prediction"],
            "pcos_probability": fused["pcos_probability"],
            "normal_probability": fused["normal_probability"],
            "threshold": fused["threshold"],
        },
        "clinical": {
            "prediction": clinical_result["prediction"],
            "pcos_probability": clinical_result["pcos_probability"],
            "normal_probability": clinical_result["normal_probability"],
        },
        "image": {
            "prediction": CLASS_NAMES[1] if image_pcos_prob >= 0.50 else CLASS_NAMES[0],
            "pcos_probability": round(image_pcos_prob, 4),
            "normal_probability": round(1.0 - image_pcos_prob, 4),
        },
        "gradcam_image": gradcam_b64,
    }


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=7860)


# ── Federated Learning endpoints ─────────────────────────────────────────────

_FL_METRICS_PATH = os.path.join(_BACKEND_DIR, "fl_metrics.json")

_FL_HOSPITALS = [
    { "id": "hospital_a", "name": "Hospital A", "location": "Node 1" },
    { "id": "hospital_b", "name": "Hospital B", "location": "Node 2" },
    { "id": "hospital_c", "name": "Hospital C", "location": "Node 3" },
]


def _read_fl_metrics() -> dict:
    if not os.path.exists(_FL_METRICS_PATH):
        return {
            "status": "idle",
            "current_round": 0,
            "total_rounds": 0,
            "rounds": [],
            "best_accuracy": 0.0,
            "started_at": None,
            "completed_at": None,
            "clients_connected": 0,
        }
    with open(_FL_METRICS_PATH) as f:
        return json.load(f)


_FL_COMPARISON_PATH = os.path.join(_BACKEND_DIR, "fl_comparison.json")
_FL_SCAN_LOG_PATH   = os.path.join(_BACKEND_DIR, "fl_scan_log.json")

VALID_HOSPITALS = {"hospital_a", "hospital_b", "hospital_c"}


@app.get("/federated/status", tags=["Federated"])
def federated_status():
    """Returns current FL training status and round metrics."""
    metrics = _read_fl_metrics()
    return {
        "success": True,
        "hospitals": _FL_HOSPITALS,
        **metrics,
    }


@app.get("/federated/hospitals", tags=["Federated"])
def federated_hospitals():
    """Returns nodes, keeping nodes with assigned scans visibly active."""
    metrics  = _read_fl_metrics()
    connected = metrics.get("clients_connected", 0)
    scans = []
    if os.path.exists(_FL_SCAN_LOG_PATH):
        try:
            with open(_FL_SCAN_LOG_PATH) as f:
                scans = json.load(f)
        except (OSError, json.JSONDecodeError):
            pass
    hospitals = [
        {
            **h,
            "scan_count": sum(scan.get("hospital") == h["id"] for scan in scans),
            "connected": i < connected or any(scan.get("hospital") == h["id"] for scan in scans),
        }
        for i, h in enumerate(_FL_HOSPITALS)
    ]
    return {"success": True, "hospitals": hospitals}


@app.get("/federated/comparison", tags=["Federated"])
def federated_comparison():
    """
    Stage 5: Returns centralized vs local vs federated accuracy comparison.
    Run fl_evaluate.py first to generate fl_comparison.json.
    """
    if not os.path.exists(_FL_COMPARISON_PATH):
        return {"success": False, "message": "Run fl_evaluate.py to generate comparison data.", "data": []}
    with open(_FL_COMPARISON_PATH) as f:
        data = json.load(f)
    return {"success": True, "data": data}


@app.post("/federated/scans", tags=["Federated"])
def log_federated_scan(payload: dict):
    """
    Receives a scan result from the frontend and appends it to fl_scan_log.json
    tagged with the chosen hospital node.
    """
    hospital = payload.get("hospital", "")
    if hospital not in VALID_HOSPITALS:
        raise HTTPException(status_code=422, detail=f"Invalid hospital. Choose from: {sorted(VALID_HOSPITALS)}")

    entry = {
        "id":                  payload.get("id", ""),
        "hospital":            hospital,
        "timestamp":           payload.get("timestamp", ""),
        "fileName":            payload.get("fileName", ""),
        "prediction":          payload.get("prediction", ""),
        "pcos_probability":    payload.get("pcos_probability", 0),
        "normal_probability":  payload.get("normal_probability", 0),
        "image_prediction":    payload.get("image_prediction", ""),
        "clinical_prediction": payload.get("clinical_prediction", ""),
    }

    scans = []
    if os.path.exists(_FL_SCAN_LOG_PATH):
        with open(_FL_SCAN_LOG_PATH) as f:
            scans = json.load(f)

    scans.insert(0, entry)          # newest first
    scans = scans[:200]             # keep last 200

    with open(_FL_SCAN_LOG_PATH, "w") as f:
        json.dump(scans, f, indent=2)

    return {"success": True, "entry": entry}


# ── FL process handle (module-level so stop can kill it) ─────────────────────
_fl_process: subprocess.Popen | None = None
_fl_pids: list[int] = []   # all child PIDs written by run_fl.py
_fl_lock = threading.Lock()


class FLStartRequest(BaseModel):
    rounds: int = 10
    epochs: int = 3


def _kill_fl():
    """Kill every tracked FL PID plus the run_fl parent on Windows."""
    global _fl_process, _fl_pids
    all_pids = list(_fl_pids)
    if _fl_process:
        all_pids.append(_fl_process.pid)
    for pid in all_pids:
        try:
            # Do not make the HTTP Stop response wait for every Windows
            # process to exit; taskkill continues independently.
            subprocess.Popen(["taskkill", "/F", "/PID", str(pid)],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    _fl_process = None
    _fl_pids = []


_FL_PIDS_PATH = os.path.join(_BACKEND_DIR, "fl_pids.json")
_FL_LOG_PATH = os.path.join(_BACKEND_DIR, "fl_live_log.json")


@app.post("/federated/start", tags=["Federated"])
def federated_start(req: FLStartRequest):
    """Pre-checks all hospital data, warns if unchanged, then launches run_fl.py."""
    global _fl_process

    with _fl_lock:
        if _fl_process and _fl_process.poll() is None:
            raise HTTPException(status_code=409, detail="FL session is already running.")

    # ── pre-flight: verify each hospital has train/val data ──
    hospitals = ["hospital_a", "hospital_b", "hospital_c"]
    data_root = os.path.join(_BACKEND_DIR, "data", "federated")
    issues: list[str] = []

    for h in hospitals:
        h_dir   = os.path.join(data_root, h)
        label   = h.replace("hospital_", "Hospital ").upper()
        if not os.path.isdir(os.path.join(h_dir, "train")):
            issues.append(f"{label}: missing image train/ folder")
        if not os.path.isdir(os.path.join(h_dir, "val")):
            issues.append(f"{label}: missing image val/ folder")
        if not os.path.isfile(os.path.join(h_dir, "clinical_train.csv")):
            issues.append(f"{label}: missing clinical_train.csv")
        if not os.path.isfile(os.path.join(h_dir, "clinical_val.csv")):
            issues.append(f"{label}: missing clinical_val.csv")

    if issues:
        raise HTTPException(
            status_code=422,
            detail={"message": "Cannot start FL — data missing.", "issues": issues},
        )

    # ── data-unchanged check: hash all federated files ──
    import hashlib
    hasher = hashlib.md5()
    for h in hospitals:
        h_dir = os.path.join(data_root, h)
        for root, _, files in os.walk(h_dir):
            for fname in sorted(files):
                fpath = os.path.join(root, fname)
                try:
                    hasher.update(fname.encode())
                    hasher.update(str(os.path.getsize(fpath)).encode())
                    hasher.update(str(int(os.path.getmtime(fpath))).encode())
                except OSError:
                    pass
    current_hash = hasher.hexdigest()

    prev_metrics = _read_fl_metrics()
    prev_hash    = prev_metrics.get("data_hash", "")
    data_unchanged = (prev_hash == current_hash and prev_metrics.get("status") == "completed")

    # A completed run has already trained on this exact data snapshot.  Do not
    # spend time and compute running it again; return a clear response the UI
    # can show as soon as the Start button is clicked.
    if data_unchanged:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "No new federated data was found since the last completed training run. Add or update data before starting FL training again.",
                "data_unchanged": True,
            },
        )

    run_fl_path = os.path.join(_BACKEND_DIR, "run_fl.py")
    with _fl_lock:
        _fl_pids.clear()
        if os.path.exists(_FL_PIDS_PATH):
            os.remove(_FL_PIDS_PATH)
        _fl_process = subprocess.Popen(
            [sys.executable, run_fl_path,
             "--rounds", str(req.rounds),
             "--epochs", str(req.epochs),
             "--pids_file", _FL_PIDS_PATH,
             "--log_file", _FL_LOG_PATH,
             "--data_hash", current_hash],
            cwd=_BACKEND_DIR,
        )

    return {
        "success": True,
        "message": f"FL started — {req.rounds} rounds, {req.epochs} epochs/client.",
        "pid": _fl_process.pid,
        "data_unchanged": False,
    }


@app.get("/federated/logs", tags=["Federated"])
def federated_logs(limit: int = 100):
    """Returns recent FL server and hospital-local activity for the dashboard."""
    if not os.path.exists(_FL_LOG_PATH):
        return {"success": True, "logs": []}
    try:
        with open(_FL_LOG_PATH, encoding="utf-8") as file:
            logs = json.load(file)
    except (OSError, json.JSONDecodeError):
        logs = []
    return {"success": True, "logs": logs[-max(1, min(limit, 250)):]}


@app.post("/federated/stop", tags=["Federated"])
def federated_stop():
    """Kills every FL process (server + all 3 clients + run_fl parent)."""
    global _fl_process, _fl_pids

    # load PIDs written by run_fl.py if in-memory list is empty (e.g. after restart)
    with _fl_lock:
        if not _fl_pids and os.path.exists(_FL_PIDS_PATH):
            try:
                with open(_FL_PIDS_PATH) as f:
                    _fl_pids = json.load(f)
            except Exception:
                pass

        if not _fl_pids and (_fl_process is None or _fl_process.poll() is not None):
            # Uvicorn can restart while a former FL run has left its metrics
            # marked as running. Recover that orphaned UI state so the Start
            # button is usable again instead of leaving the dashboard stuck.
            m = _read_fl_metrics()
            m["status"] = "idle"
            m["clients_connected"] = 0
            with open(_FL_METRICS_PATH, "w") as f:
                json.dump(m, f, indent=2)
            return {"success": True, "message": "Cleared a stale FL session; no active training process was running."}

        _kill_fl()

    if os.path.exists(_FL_PIDS_PATH):
        os.remove(_FL_PIDS_PATH)

    # mark metrics as stopped
    m = _read_fl_metrics()
    if m.get("status") == "running":
        m["status"] = "idle"
        with open(_FL_METRICS_PATH, "w") as f:
            json.dump(m, f, indent=2)

    return {"success": True, "message": "FL session stopped."}


@app.get("/federated/scans", tags=["Federated"])
def get_federated_scans(hospital: str = None):
    """
    Returns all scans logged via /federated/scans.
    Optionally filter by hospital query param: ?hospital=hospital_a
    """
    if not os.path.exists(_FL_SCAN_LOG_PATH):
        return {"success": True, "scans": []}
    with open(_FL_SCAN_LOG_PATH) as f:
        scans = json.load(f)
    if hospital:
        scans = [s for s in scans if s.get("hospital") == hospital]
    return {"success": True, "scans": scans}
