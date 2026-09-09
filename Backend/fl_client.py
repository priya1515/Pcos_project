"""
fl_client.py  —  Federated Learning Client (Stages 1-3)
========================================================
Each hospital client:
  1. Receives the global model parameters from the FL server.
  2. Trains the image model (ResNet-50) on its local ultrasound images.
  3. Trains the clinical model (ClinicalMLP) on its local clinical CSV.
  4. Sends updated parameters back to the server (NO patient data leaves).
  5. Evaluates both models and reports image_accuracy, clinical_accuracy,
     fused_accuracy to the server for aggregation.

Usage:
    python fl_client.py --hospital hospital_a
    python fl_client.py --hospital hospital_b
    python fl_client.py --hospital hospital_c
"""

import os
import sys
import csv
import argparse
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from torchvision import datasets
import flwr as fl

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

from model import get_model
from dataset import get_transforms
from clinical_model import ClinicalMLP, selected_features, imputer, scaler, threshold

CLASS_NAMES         = ["normal", "pcos"]
IMAGE_MODEL_PATH    = os.path.join(_BACKEND_DIR, "models", "image",    "best_model.pth")
CLINICAL_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "clinical", "clinical_mlp_model2_best.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Set once after image model is built; used to split combined weight list
N_IMAGE_PARAMS: int = 0


# ── weight helpers ────────────────────────────────────────────────────────────

def get_weights(model: nn.Module):
    return [p.detach().cpu().numpy().astype(np.float16) for p in model.parameters()]


def set_weights(model: nn.Module, weights):
    for param, w in zip(model.parameters(), weights):
        param.data = torch.tensor(w.astype(np.float32), dtype=torch.float32).to(device)


def split_weights(combined, n_image: int):
    return combined[:n_image], combined[n_image:]


def weight_summary(model: nn.Module):
    """Compact model diagnostics for the dashboard; raw tensors stay local."""
    parameters = list(model.parameters())
    count = sum(parameter.numel() for parameter in parameters)
    if not count:
        return {"l2_norm": 0.0, "mean_abs": 0.0}
    squared_sum = sum(float(torch.sum(parameter.detach().float().square()).item()) for parameter in parameters)
    absolute_sum = sum(float(torch.sum(parameter.detach().float().abs()).item()) for parameter in parameters)
    return {"l2_norm": squared_sum ** 0.5, "mean_abs": absolute_sum / count}


# ── clinical CSV loader ───────────────────────────────────────────────────────

def load_clinical_csv(csv_path: str):
    if not os.path.exists(csv_path):
        return None, None

    rows, labels = [], []
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                values = [float(row[feat]) for feat in selected_features]
                label  = int(float(row["label"]))
                rows.append(values)
                labels.append(label)
            except (KeyError, ValueError):
                continue

    if not rows:
        return None, None

    # The fitted imputer/scaler expect the original feature names. Keeping
    # them here avoids sklearn's warning and preserves column alignment.
    X = pd.DataFrame(rows, columns=selected_features, dtype=np.float32)
    X = imputer.transform(X)
    X = scaler.transform(X).astype(np.float32)
    y = np.array(labels, dtype=np.int64)
    return torch.tensor(X).to(device), torch.tensor(y).to(device)


# ── image training / evaluation ───────────────────────────────────────────────

def train_image(model, loader, epochs, lr=1e-4):
    model.train()
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=lr
    )
    criterion = nn.CrossEntropyLoss()
    for epoch in range(epochs):
        total = 0.0
        for imgs, lbls in loader:
            imgs, lbls = imgs.to(device), lbls.to(device)
            optimizer.zero_grad()
            loss = criterion(model(imgs), lbls)
            loss.backward()
            optimizer.step()
            total += loss.item()
        print(f"    [image] epoch {epoch+1}/{epochs}  loss={total/len(loader):.4f}")


def eval_image(model, loader):
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss, correct, total = 0.0, 0, 0
    with torch.no_grad():
        for imgs, lbls in loader:
            imgs, lbls = imgs.to(device), lbls.to(device)
            out = model(imgs)
            total_loss += criterion(out, lbls).item()
            correct    += (out.argmax(1) == lbls).sum().item()
            total      += lbls.size(0)
    return total_loss / len(loader), correct / total


# ── clinical training / evaluation ───────────────────────────────────────────

def train_clinical(model, X, y, epochs, lr=1e-3):
    model.train()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCEWithLogitsLoss()
    loader    = DataLoader(TensorDataset(X, y.float()), batch_size=32, shuffle=True)
    for epoch in range(epochs):
        total = 0.0
        for xb, yb in loader:
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()
            total += loss.item()
        print(f"    [clinical] epoch {epoch+1}/{epochs}  loss={total/len(loader):.4f}")


def eval_clinical(model, X, y):
    model.eval()
    criterion = nn.BCEWithLogitsLoss()
    with torch.no_grad():
        logits = model(X)
        loss   = criterion(logits, y.float()).item()
        probs  = torch.sigmoid(logits)
        preds  = (probs >= threshold).long()
        acc    = (preds == y).float().mean().item()
    return loss, acc


# ── Flower client ─────────────────────────────────────────────────────────────

class PCOSMultimodalClient(fl.client.NumPyClient):

    def __init__(self, hospital: str, data_dir: str, epochs: int, batch_size: int):
        self.hospital = hospital
        self.epochs   = epochs
        global N_IMAGE_PARAMS

        hospital_dir = os.path.join(data_dir, hospital)
        train_dir    = os.path.join(hospital_dir, "train")
        val_dir      = os.path.join(hospital_dir, "val")

        if not os.path.exists(train_dir):
            raise FileNotFoundError(
                f"Hospital data not found at {train_dir}.\n"
                "Run: python split_dataset.py  then  python split_clinical.py"
            )

        # ── Stage 2: Image data ──────────────────────────────────────────────
        train_ds = datasets.ImageFolder(train_dir, transform=get_transforms(True))
        val_ds   = datasets.ImageFolder(val_dir,   transform=get_transforms(False))
        self.train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,  num_workers=0, drop_last=True)
        self.val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=0)
        self.n_train_img  = len(train_ds)
        self.n_val_img    = len(val_ds)

        # ── Stage 1: Clinical data ───────────────────────────────────────────
        self.X_train_c, self.y_train_c = load_clinical_csv(
            os.path.join(hospital_dir, "clinical_train.csv")
        )
        self.X_val_c, self.y_val_c = load_clinical_csv(
            os.path.join(hospital_dir, "clinical_val.csv")
        )
        self.has_clinical = self.X_train_c is not None and self.X_val_c is not None

        # ── Image model (ResNet-50) ──────────────────────────────────────────
        self.image_model = get_model(num_classes=len(CLASS_NAMES), freeze_base=False).to(device)
        if os.path.exists(IMAGE_MODEL_PATH):
            self.image_model.load_state_dict(
                torch.load(IMAGE_MODEL_PATH, map_location=device)
            )
        N_IMAGE_PARAMS = len(get_weights(self.image_model))

        # ── Clinical model (MLP) ─────────────────────────────────────────────
        self.clinical_model = ClinicalMLP(input_features=len(selected_features)).to(device)
        if os.path.exists(CLINICAL_MODEL_PATH):
            self.clinical_model.load_state_dict(
                torch.load(CLINICAL_MODEL_PATH, map_location=device)
            )

        print(f"[{hospital}] Image  — train: {self.n_train_img}  val: {self.n_val_img}")
        if self.has_clinical:
            print(f"[{hospital}] Clinical — train: {len(self.X_train_c)}  val: {len(self.X_val_c)}")
        else:
            print(f"[{hospital}] No clinical CSV — image-only mode")

    # ── Flower API ────────────────────────────────────────────────────────────

    def get_parameters(self, config):
        """Return combined image + clinical weights to the server."""
        return get_weights(self.image_model) + get_weights(self.clinical_model)

    def fit(self, parameters, config):
        """
        Receive global model from server → train locally → return updated weights.
        Patient data never leaves this function.
        """
        img_w, clin_w = split_weights(parameters, N_IMAGE_PARAMS)
        set_weights(self.image_model,    img_w)   # ← global model received
        set_weights(self.clinical_model, clin_w)  # ← global model received

        # Stage 2: local image training
        print(f"[{self.hospital}] Training image model ({self.epochs} epochs)...")
        train_image(self.image_model, self.train_loader, self.epochs)

        # Stage 1: local clinical training
        if self.has_clinical:
            print(f"[{self.hospital}] Training clinical model ({self.epochs} epochs)...")
            train_clinical(self.clinical_model, self.X_train_c, self.y_train_c, self.epochs)

        # Return updated weights — NO patient data included
        updated = get_weights(self.image_model) + get_weights(self.clinical_model)
        image_weights = weight_summary(self.image_model)
        clinical_weights = weight_summary(self.clinical_model)
        return updated, self.n_train_img, {
            "hospital": self.hospital,
            "image_l2_norm": image_weights["l2_norm"],
            "clinical_l2_norm": clinical_weights["l2_norm"],
            "image_mean_abs": image_weights["mean_abs"],
            "clinical_mean_abs": clinical_weights["mean_abs"],
        }

    def evaluate(self, parameters, config):
        """
        Receive global model → evaluate on local val set → report metrics.
        """
        img_w, clin_w = split_weights(parameters, N_IMAGE_PARAMS)
        set_weights(self.image_model,    img_w)
        set_weights(self.clinical_model, clin_w)

        # Stage 2: image evaluation
        img_loss, img_acc = eval_image(self.image_model, self.val_loader)
        print(f"[{self.hospital}] Image  — loss={img_loss:.4f}  acc={img_acc*100:.2f}%")

        metrics = {
            "accuracy":       float(img_acc),
            "loss":           float(img_loss),
            "image_accuracy": float(img_acc),
            "image_loss":     float(img_loss),
        }

        # Stage 1 + 3: clinical + fused evaluation
        if self.has_clinical:
            clin_loss, clin_acc = eval_clinical(
                self.clinical_model, self.X_val_c, self.y_val_c
            )
            print(f"[{self.hospital}] Clinical — loss={clin_loss:.4f}  acc={clin_acc*100:.2f}%")

            # Stage 3: simple 50/50 fusion
            fused_acc = 0.5 * img_acc + 0.5 * clin_acc
            print(f"[{self.hospital}] Fused   — acc={fused_acc*100:.2f}%")

            metrics.update({
                "clinical_accuracy": float(clin_acc),
                "clinical_loss":     float(clin_loss),
                "fused_accuracy":    float(fused_acc),
            })

        # Save per-hospital global model snapshot
        _img_out  = os.path.join(_BACKEND_DIR, "models", "image",    f"fl_global_{self.hospital}.pth")
        _clin_out = os.path.join(_BACKEND_DIR, "models", "clinical", f"fl_global_clinical_{self.hospital}.pth")
        torch.save(self.image_model.state_dict(),    _img_out)
        torch.save(self.clinical_model.state_dict(), _clin_out)

        return float(img_loss), self.n_val_img, metrics


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hospital",   default="hospital_a",    help="hospital_a | hospital_b | hospital_c")
    parser.add_argument("--data_dir",   default="./data/federated")
    parser.add_argument("--epochs",     type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--server",     default="localhost:8080")
    args = parser.parse_args()

    client = PCOSMultimodalClient(
        hospital=args.hospital,
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
    )
    fl.client.start_numpy_client(
        server_address=args.server,
        client=client,
        grpc_max_message_length=536870912,  # 512 MB — safe C long value
    )


if __name__ == "__main__":
    main()
