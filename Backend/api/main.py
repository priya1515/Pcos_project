import io
import sys
import os
import torch
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
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        input_tensor = transform(image).unsqueeze(0).to(device)

        with torch.inference_mode():
            outputs = image_model(input_tensor)
            img_probs = torch.nn.functional.softmax(outputs[0], dim=0)

        image_pcos_prob = img_probs[CLASS_NAMES.index("pcos")].item()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image processing failed: {e}")

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
    }


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=7860)