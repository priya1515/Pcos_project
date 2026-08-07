import io
import torch
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from PIL import Image
from model import get_model
from dataset import get_transforms

app = FastAPI(title="FemWell PCOS Ultrasound Classifier")

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
MODEL_PATH = "best_model.pth"

# Load model once at startup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = get_model(num_classes=len(CLASS_NAMES))
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model = model.to(device)
model.eval()

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

    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, predicted_idx = torch.max(probabilities, 0)

    prediction = CLASS_NAMES[predicted_idx.item()]
    probs = {cls: round(probabilities[i].item() * 100, 2) for i, cls in enumerate(CLASS_NAMES)}

    return {
        "prediction": prediction,
        "confidence": round(confidence.item() * 100, 2),
        "probabilities": probs,
    }


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=7860)