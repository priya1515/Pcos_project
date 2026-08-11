import os
import joblib
import torch
import torch.nn as nn
import numpy as np


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CLINICAL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "clinical"
)

MODEL_PATH = os.path.join(
    CLINICAL_DIR,
    "clinical_mlp_model2_best.pth"
)

FEATURE_PATH = os.path.join(
    CLINICAL_DIR,
    "pcos_clinical_final_features.pkl"
)

IMPUTER_PATH = os.path.join(
    CLINICAL_DIR,
    "pcos_clinical_final_imputer.pkl"
)

SCALER_PATH = os.path.join(
    CLINICAL_DIR,
    "pcos_clinical_final_scaler.pkl"
)

THRESHOLD_PATH = os.path.join(
    CLINICAL_DIR,
    "pcos_clinical_final_threshold.pkl"
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# LOAD SELECTED FEATURES
# ============================================================

selected_features = joblib.load(
    FEATURE_PATH
)

print("Selected clinical features:")
for i, feature in enumerate(selected_features):
    print(f"{i}: {feature}")

print(
    f"\nNumber of selected features: "
    f"{len(selected_features)}"
)


# ============================================================
# LOAD IMPUTER AND SCALER
# ============================================================

imputer = joblib.load(
    IMPUTER_PATH
)

scaler = joblib.load(
    SCALER_PATH
)


# ============================================================
# LOAD THRESHOLD
# ============================================================

threshold = joblib.load(
    THRESHOLD_PATH
)

print(
    f"Clinical classification threshold: "
    f"{threshold}"
)


# ============================================================
# MODEL ARCHITECTURE
# ============================================================

class ClinicalMLP(nn.Module):

    def __init__(self, input_features):
        super().__init__()

        self.network = nn.Sequential(

            nn.Linear(input_features, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.30),

            nn.Linear(64, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.Dropout(0.20),

            nn.Linear(32, 16),
            nn.ReLU(),

            nn.Linear(16, 1)
        )

    def forward(self, x):
        return self.network(x).squeeze(1)


# ============================================================
# CREATE MODEL
# ============================================================

model = ClinicalMLP(
    input_features=len(selected_features)
)


# ============================================================
# LOAD TRAINED WEIGHTS
# ============================================================

model.load_state_dict(
    torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )
)

model.to(DEVICE)
model.eval()

print("\nClinical Model 2 loaded successfully.")
print("Device:", DEVICE)


# ============================================================
# CLINICAL PREDICTION FUNCTION
# ============================================================

def predict_clinical(clinical_data):

    """
    clinical_data:
        Dictionary containing the selected clinical features.

    Returns:
        prediction
        PCOS probability
        Normal probability
    """

    # --------------------------------------------------------
    # Check missing features
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in selected_features
        if feature not in clinical_data
    ]

    if missing_features:

        raise ValueError(
            "Missing clinical features: "
            + ", ".join(missing_features)
        )


    # --------------------------------------------------------
    # Arrange features in EXACT training order
    # --------------------------------------------------------

    values = [
        clinical_data[feature]
        for feature in selected_features
    ]


    # --------------------------------------------------------
    # Convert to NumPy
    # --------------------------------------------------------

    X = np.array(
        values,
        dtype=float
    ).reshape(1, -1)


    # --------------------------------------------------------
    # Apply training imputer
    # --------------------------------------------------------

    X_imputed = imputer.transform(X)


    # --------------------------------------------------------
    # Apply training scaler
    # --------------------------------------------------------

    X_scaled = scaler.transform(
        X_imputed
    )


    # --------------------------------------------------------
    # Convert to PyTorch tensor
    # --------------------------------------------------------

    X_tensor = torch.tensor(
        X_scaled,
        dtype=torch.float32
    ).to(DEVICE)


    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    with torch.inference_mode():

        logits = model(X_tensor)

        probability = torch.sigmoid(
            logits
        ).item()


    # --------------------------------------------------------
    # Classification using saved threshold
    # --------------------------------------------------------

    prediction = (
        1
        if probability >= threshold
        else 0
    )


    # --------------------------------------------------------
    # Probabilities
    # --------------------------------------------------------

    pcos_probability = probability

    normal_probability = 1.0 - probability


    return {
        "prediction": (
            "PCOS"
            if prediction == 1
            else "Normal"
        ),

        "prediction_label": prediction,

        "pcos_probability": pcos_probability,

        "normal_probability": normal_probability,

        "threshold": threshold
    }