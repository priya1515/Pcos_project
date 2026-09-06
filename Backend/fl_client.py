"""
fl_client.py
Flower federated learning client for PCOS ResNet-50 model.

Usage:
    python fl_client.py --hospital hospital_a --data_dir ./data/federated --epochs 3
    python fl_client.py --hospital hospital_b --data_dir ./data/federated --epochs 3
    python fl_client.py --hospital hospital_c --data_dir ./data/federated --epochs 3
"""

import os
import sys
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets
import flwr as fl

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

from model import get_model
from dataset import get_transforms

CLASS_NAMES      = ["normal", "pcos"]
MODEL_PATH       = os.path.join(_BACKEND_DIR, "models", "image", "best_model.pth")
UPDATED_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "image", "fl_global_model.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ── Weight helpers ────────────────────────────────────────────────────────────

def get_weights(model: nn.Module):
    return [p.cpu().numpy() for p in model.parameters()]


def set_weights(model: nn.Module, weights):
    params = zip(model.parameters(), weights)
    for param, weight in params:
        param.data = torch.tensor(weight, dtype=torch.float32).to(device)


# ── Training / evaluation ─────────────────────────────────────────────────────

def train(model, loader, epochs, lr=1e-4):
    model.train()
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=lr
    )
    criterion = nn.CrossEntropyLoss()

    for epoch in range(epochs):
        total_loss = 0.0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        print(f"  Epoch {epoch+1}/{epochs}  loss={total_loss/len(loader):.4f}")


def evaluate(model, loader):
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss, correct, total = 0.0, 0, 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            total_loss += criterion(outputs, labels).item()
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()
            total   += labels.size(0)

    return total_loss / len(loader), correct / total


# ── Flower client ─────────────────────────────────────────────────────────────

class PCOSFederatedClient(fl.client.NumPyClient):

    def __init__(self, hospital: str, data_dir: str, epochs: int, batch_size: int):
        self.hospital   = hospital
        self.epochs     = epochs

        hospital_dir = os.path.join(data_dir, hospital)
        train_dir    = os.path.join(hospital_dir, "train")
        val_dir      = os.path.join(hospital_dir, "val")

        if not os.path.exists(train_dir):
            raise FileNotFoundError(
                f"Hospital data not found at {train_dir}. "
                f"Run split_dataset.py first."
            )

        train_dataset = datasets.ImageFolder(train_dir, transform=get_transforms(True))
        val_dataset   = datasets.ImageFolder(val_dir,   transform=get_transforms(False))

        self.train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        self.val_loader   = DataLoader(val_dataset,   batch_size=batch_size, shuffle=False)
        self.n_train      = len(train_dataset)
        self.n_val        = len(val_dataset)

        # Load model starting from existing best_model.pth
        self.model = get_model(num_classes=len(CLASS_NAMES), freeze_base=False)
        if os.path.exists(MODEL_PATH):
            self.model.load_state_dict(
                torch.load(MODEL_PATH, map_location=device)
            )
            print(f"[{hospital}] Loaded weights from best_model.pth")
        self.model = self.model.to(device)

        print(f"[{hospital}] Train: {self.n_train} samples  Val: {self.n_val} samples")

    def get_parameters(self, config):
        return get_weights(self.model)

    def fit(self, parameters, config):
        set_weights(self.model, parameters)
        print(f"[{self.hospital}] Training for {self.epochs} epochs...")
        train(self.model, self.train_loader, self.epochs)
        return get_weights(self.model), self.n_train, {}

    def evaluate(self, parameters, config):
        set_weights(self.model, parameters)
        loss, accuracy = evaluate(self.model, self.val_loader)
        print(f"[{self.hospital}] Eval — loss={loss:.4f}  accuracy={accuracy*100:.2f}%")

        # Save the latest global model weights locally
        torch.save(self.model.state_dict(), UPDATED_MODEL_PATH)

        return float(loss), self.n_val, {
            "accuracy": float(accuracy),
            "loss":     float(loss),
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hospital",   default="hospital_a",      help="hospital_a | hospital_b | hospital_c")
    parser.add_argument("--data_dir",   default="./data/federated", help="Path to federated data splits")
    parser.add_argument("--epochs",     type=int, default=3,        help="Local epochs per round")
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--server",     default="localhost:8080",   help="FL server address")
    args = parser.parse_args()

    client = PCOSFederatedClient(
        hospital=args.hospital,
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
    )

    fl.client.start_numpy_client(
        server_address=args.server,
        client=client,
    )


if __name__ == "__main__":
    main()
