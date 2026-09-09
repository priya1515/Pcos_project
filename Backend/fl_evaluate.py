"""
fl_evaluate.py  —  Stage 5: Centralized vs Local vs Federated Comparison
=========================================================================
Evaluates three model variants on the shared test set and prints a
side-by-side comparison table.

  Centralized  — best_model.pth (trained on all data at once)
  Local        — fl_global_hospital_X.pth (each hospital's local model)
  Federated    — fl_global_model.pth (FedAvg global model)

Usage:
    python fl_evaluate.py
    python fl_evaluate.py --test_dir ./data/test --batch_size 32
"""

import os
import sys
import argparse
import csv

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

from model import get_model
from dataset import get_transforms
from clinical_model import ClinicalMLP, selected_features, imputer, scaler, threshold

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CLASS_NAMES = ["normal", "pcos"]

MODELS_IMAGE    = os.path.join(_BACKEND_DIR, "models", "image")
MODELS_CLINICAL = os.path.join(_BACKEND_DIR, "models", "clinical")


# ── evaluation helpers ────────────────────────────────────────────────────────

def eval_image_model(model_path: str, loader: DataLoader):
    if not os.path.exists(model_path):
        return None, None

    model = get_model(num_classes=2, freeze_base=False).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
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


def eval_clinical_model(model_path: str, csv_path: str):
    if not os.path.exists(model_path) or not os.path.exists(csv_path):
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

    import numpy as np
    X = imputer.transform(scaler.transform(
        imputer.transform(
            __import__("numpy").array(rows, dtype=__import__("numpy").float32)
        )
    ).astype(__import__("numpy").float32))

    import numpy as np
    X_np = np.array(rows, dtype=np.float32)
    X_np = imputer.transform(X_np)
    X_np = scaler.transform(X_np).astype(np.float32)
    y_np = np.array(labels, dtype=np.int64)

    X_t = torch.tensor(X_np).to(device)
    y_t = torch.tensor(y_np).to(device)

    model = ClinicalMLP(input_features=len(selected_features)).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    criterion = nn.BCEWithLogitsLoss()
    with torch.no_grad():
        logits = model(X_t)
        loss   = criterion(logits, y_t.float()).item()
        preds  = (torch.sigmoid(logits) >= threshold).long()
        acc    = (preds == y_t).float().mean().item()

    return loss, acc


# ── pretty table ──────────────────────────────────────────────────────────────

def _row(label, img_loss, img_acc, clin_loss=None, clin_acc=None, fused_acc=None):
    def fmt_acc(v):  return f"{v*100:6.2f}%" if v is not None else "  N/A  "
    def fmt_loss(v): return f"{v:.4f}"        if v is not None else "  N/A "

    fused = fmt_acc(fused_acc) if fused_acc is not None else "  N/A  "
    print(f"  {label:<28} | {fmt_loss(img_loss)}  {fmt_acc(img_acc)} "
          f"| {fmt_loss(clin_loss) if clin_loss else '  N/A '}  {fmt_acc(clin_acc)} "
          f"| {fused}")


def print_table(rows):
    header = f"  {'Model':<28} | {'Img Loss':>8}  {'Img Acc':>7} | {'Clin Loss':>9}  {'Clin Acc':>8} | {'Fused Acc':>9}"
    sep    = "  " + "-" * (len(header) - 2)
    print("\n" + sep)
    print(header)
    print(sep)
    for r in rows:
        _row(*r)
    print(sep + "\n")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--test_dir",    default="./data/test")
    parser.add_argument("--fed_dir",     default="./data/federated")
    parser.add_argument("--batch_size",  type=int, default=32)
    args = parser.parse_args()

    test_dir = os.path.join(_BACKEND_DIR, args.test_dir) if not os.path.isabs(args.test_dir) else args.test_dir
    fed_dir  = os.path.join(_BACKEND_DIR, args.fed_dir)  if not os.path.isabs(args.fed_dir)  else args.fed_dir

    if not os.path.exists(test_dir):
        print(f"[Evaluate] Test directory not found: {test_dir}")
        return

    loader = DataLoader(
        datasets.ImageFolder(test_dir, transform=get_transforms(False)),
        batch_size=args.batch_size, shuffle=False, num_workers=0
    )
    print(f"[Evaluate] Test set: {len(loader.dataset)} images")

    rows = []

    # ── Centralized model ────────────────────────────────────────────────────
    central_path = os.path.join(MODELS_IMAGE, "best_model.pth")
    il, ia = eval_image_model(central_path, loader)
    cl, ca = eval_clinical_model(
        os.path.join(MODELS_CLINICAL, "clinical_mlp_model2_best.pth"),
        os.path.join(fed_dir, "hospital_a", "clinical_val.csv"),  # proxy test set
    )
    fused = (0.5 * ia + 0.5 * ca) if (ia and ca) else None
    rows.append(("Centralized", il, ia, cl, ca, fused))

    # ── Local models (per hospital) ──────────────────────────────────────────
    for hospital in ["hospital_a", "hospital_b", "hospital_c"]:
        img_path  = os.path.join(MODELS_IMAGE,    f"fl_global_{hospital}.pth")
        clin_path = os.path.join(MODELS_CLINICAL, f"fl_global_clinical_{hospital}.pth")
        csv_path  = os.path.join(fed_dir, hospital, "clinical_val.csv")

        il, ia = eval_image_model(img_path, loader)
        cl, ca = eval_clinical_model(clin_path, csv_path)
        fused  = (0.5 * ia + 0.5 * ca) if (ia and ca) else None
        rows.append((f"Local ({hospital})", il, ia, cl, ca, fused))

    # ── Federated global model ───────────────────────────────────────────────
    fed_img_path  = os.path.join(MODELS_IMAGE,    "fl_global_model.pth")
    fed_clin_path = os.path.join(MODELS_CLINICAL, "fl_global_clinical.pth")
    csv_path      = os.path.join(fed_dir, "hospital_a", "clinical_val.csv")

    il, ia = eval_image_model(fed_img_path, loader)
    cl, ca = eval_clinical_model(fed_clin_path, csv_path)
    fused  = (0.5 * ia + 0.5 * ca) if (ia and ca) else None
    rows.append(("Federated (Global)", il, ia, cl, ca, fused))

    print_table(rows)

    # ── Save to JSON for dashboard ───────────────────────────────────────────
    import json
    out = []
    for label, il, ia, cl, ca, fa in rows:
        out.append({
            "model":            label,
            "image_loss":       round(il, 4)       if il is not None else None,
            "image_accuracy":   round(ia * 100, 2) if ia is not None else None,
            "clinical_loss":    round(cl, 4)       if cl is not None else None,
            "clinical_accuracy":round(ca * 100, 2) if ca is not None else None,
            "fused_accuracy":   round(fa * 100, 2) if fa is not None else None,
        })
    out_path = os.path.join(_BACKEND_DIR, "fl_comparison.json")
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"[Evaluate] Comparison saved → {out_path}")


if __name__ == "__main__":
    main()
