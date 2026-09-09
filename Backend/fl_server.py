"""
fl_server.py  —  Federated Learning Server  (flwr 1.36 compatible)
===================================================================
Round flow:
  1. Server loads pretrained ResNet-50 + ClinicalMLP weights and broadcasts
     them to all clients as the initial global model.
  2. Each client trains locally and returns updated parameters.
  3. Server applies FedAvg -> new global model.
  4. New global model is sent to clients for evaluation.
  5. Metrics written to fl_metrics.json after every round.
  6. Final global model saved to models/ after all rounds complete.

Usage:
    python fl_server.py --rounds 10 --min_clients 3
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import List, Tuple, Optional, Dict

import numpy as np
import torch
import flwr as fl
from flwr.common import (
    Metrics, Parameters,
    ndarrays_to_parameters, parameters_to_ndarrays,
    FitRes, EvaluateRes,
)
from flwr.server.client_proxy import ClientProxy

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

from model import get_model
from clinical_model import ClinicalMLP, selected_features

FL_METRICS_PATH  = os.path.join(_BACKEND_DIR, "fl_metrics.json")
IMAGE_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "image",    "best_model.pth")
CLIN_MODEL_PATH  = os.path.join(_BACKEND_DIR, "models", "clinical", "clinical_mlp_model2_best.pth")
FL_IMAGE_OUT     = os.path.join(_BACKEND_DIR, "models", "image",    "fl_global_model.pth")
FL_CLIN_OUT      = os.path.join(_BACKEND_DIR, "models", "clinical", "fl_global_clinical.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ── helpers ───────────────────────────────────────────────────────────────────

def load_metrics() -> dict:
    if os.path.exists(FL_METRICS_PATH):
        with open(FL_METRICS_PATH) as f:
            return json.load(f)
    return {
        "status": "idle", "current_round": 0, "total_rounds": 0,
        "rounds": [], "best_accuracy": 0.0,
        "started_at": None, "completed_at": None, "clients_connected": 0,
    }


def save_metrics(m: dict):
    with open(FL_METRICS_PATH, "w") as f:
        json.dump(m, f, indent=2)


def _model_weights(model: torch.nn.Module) -> List[np.ndarray]:
    return [p.detach().cpu().numpy().astype(np.float16) for p in model.parameters()]


def _load_model_weights(model: torch.nn.Module, arrays: List[np.ndarray]):
    for param, arr in zip(model.parameters(), arrays):
        param.data = torch.tensor(arr.astype(np.float32), dtype=torch.float32).to(device)


def _parameter_summary(parameters: Parameters) -> dict:
    """Return compact diagnostics, not raw model tensors (which are huge)."""
    arrays = parameters_to_ndarrays(parameters)
    count = sum(array.size for array in arrays)
    if not count:
        return {"l2_norm": 0.0, "mean_abs": 0.0, "tensors": 0}
    squared_sum = sum(float(np.sum(np.square(array, dtype=np.float64))) for array in arrays)
    absolute_sum = sum(float(np.sum(np.abs(array), dtype=np.float64)) for array in arrays)
    return {
        "l2_norm": round(float(np.sqrt(squared_sum)), 4),
        "mean_abs": round(absolute_sum / count, 7),
        "tensors": len(arrays),
    }


# ── build initial global parameters ──────────────────────────────────────────

def build_initial_parameters() -> Parameters:
    """
    Load pretrained image + clinical weights, concatenate into one flat list,
    and wrap as Flower Parameters to broadcast to all clients at round 0.
    """
    image_model = get_model(num_classes=2, freeze_base=False).to(device)
    if os.path.exists(IMAGE_MODEL_PATH):
        image_model.load_state_dict(torch.load(IMAGE_MODEL_PATH, map_location=device))
        print(f"[Server] Loaded pretrained image weights  -> {IMAGE_MODEL_PATH}")
    else:
        print("[Server] WARNING: best_model.pth not found, using random image weights")

    clin_model = ClinicalMLP(input_features=len(selected_features)).to(device)
    if os.path.exists(CLIN_MODEL_PATH):
        clin_model.load_state_dict(torch.load(CLIN_MODEL_PATH, map_location=device))
        print(f"[Server] Loaded pretrained clinical weights -> {CLIN_MODEL_PATH}")
    else:
        print("[Server] WARNING: clinical model not found, using random clinical weights")

    combined = _model_weights(image_model) + _model_weights(clin_model)
    return ndarrays_to_parameters(combined)


# ── metric aggregation (FedAvg weighted average) ──────────────────────────────

def weighted_average(metrics: List[Tuple[int, Metrics]]) -> Metrics:
    total = sum(n for n, _ in metrics)

    def wavg(key: str) -> float:
        return sum(n * m.get(key, 0.0) for n, m in metrics) / total

    result: Dict[str, float] = {
        "accuracy":       wavg("accuracy"),
        "loss":           wavg("loss"),
        "image_accuracy": wavg("image_accuracy"),
        "image_loss":     wavg("image_loss"),
    }
    if any("clinical_accuracy" in m for _, m in metrics):
        result["clinical_accuracy"] = wavg("clinical_accuracy")
        result["clinical_loss"]     = wavg("clinical_loss")
        result["fused_accuracy"]    = wavg("fused_accuracy")
    return result


# ── strategy ──────────────────────────────────────────────────────────────────

class PCOSFedAvgStrategy(fl.server.strategy.FedAvg):
    """
    FedAvg strategy that:
      - Broadcasts pretrained global model at round 0
      - Writes per-round metrics to fl_metrics.json
      - Saves final global model (image + clinical) after all rounds
    """

    def __init__(self, total_rounds: int, initial_parameters: Parameters, **kwargs):
        super().__init__(initial_parameters=initial_parameters, **kwargs)
        self.total_rounds   = total_rounds
        self._last_params: Optional[Parameters] = initial_parameters  # track latest

        m = load_metrics()
        m.update({
            "status":        "running",
            "current_round": 0,
            "total_rounds":  total_rounds,
            "started_at":    datetime.utcnow().isoformat(),
            "completed_at":  None,
            "best_accuracy": 0.0,
        })
        m["rounds"] = []   # reset round history for this new session
        m["weights"] = {"global": _parameter_summary(initial_parameters), "local": {}, "round": 0}
        save_metrics(m)
        print(f"[Server] Ready — {total_rounds} rounds, "
              f"waiting for {kwargs.get('min_available_clients', 3)} clients...")

    # ── capture aggregated parameters after each fit round ───────────────────

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures,
    ):
        aggregated = super().aggregate_fit(server_round, results, failures)
        if aggregated is not None and aggregated[0] is not None:
            self._last_params = aggregated[0]   # store for final model save
            # A fit aggregation is a genuinely completed FL round.  Record it
            # here instead of waiting for the optional evaluation phase, so
            # the dashboard's round history cannot be empty after a completed
            # FedAvg aggregation.
            m = load_metrics()
            m["current_round"] = server_round
            existing = next((r for r in m.get("rounds", [])
                             if r.get("round") == server_round), None)
            if existing is None:
                m.setdefault("rounds", []).append({
                    "round": server_round,
                    "clients": len(results),
                    "timestamp": datetime.utcnow().isoformat(),
                    "state": "aggregated",
                })
            local_weights = {}
            for _, fit_result in results:
                hospital = fit_result.metrics.get("hospital")
                if hospital:
                    local_weights[hospital] = {
                        "image_l2_norm": round(float(fit_result.metrics.get("image_l2_norm", 0)), 4),
                        "clinical_l2_norm": round(float(fit_result.metrics.get("clinical_l2_norm", 0)), 4),
                        "image_mean_abs": round(float(fit_result.metrics.get("image_mean_abs", 0)), 7),
                        "clinical_mean_abs": round(float(fit_result.metrics.get("clinical_mean_abs", 0)), 7),
                    }
            m["weights"] = {
                "global": _parameter_summary(aggregated[0]),
                "local": local_weights,
                "round": server_round,
            }
            save_metrics(m)
        return aggregated

    # ── write metrics after each evaluation round ─────────────────────────────

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, EvaluateRes]],
        failures,
    ):
        aggregated = super().aggregate_evaluate(server_round, results, failures)
        if aggregated is None:
            return aggregated

        loss, metrics = aggregated
        accuracy = metrics.get("accuracy", 0.0)

        m = load_metrics()
        m["current_round"] = server_round

        # aggregate_fit has already made this round visible.  Add evaluation
        # metrics to that record rather than appending a duplicate round.
        round_entry = next((r for r in m.setdefault("rounds", [])
                            if r.get("round") == server_round), None)
        if round_entry is None:
            round_entry = {"round": server_round}
            m["rounds"].append(round_entry)
        round_entry.update({
            "accuracy":       round(accuracy * 100, 2),
            "loss":           round(loss, 4),
            "image_accuracy": round(metrics.get("image_accuracy", accuracy) * 100, 2),
            "image_loss":     round(metrics.get("image_loss", loss), 4),
            "clients":        len(results),
            "timestamp":      datetime.utcnow().isoformat(),
            "state":          "evaluated",
        })
        if "clinical_accuracy" in metrics:
            round_entry["clinical_accuracy"] = round(metrics["clinical_accuracy"] * 100, 2)
            round_entry["clinical_loss"]     = round(metrics["clinical_loss"], 4)
            round_entry["fused_accuracy"]    = round(metrics["fused_accuracy"] * 100, 2)

        if accuracy > m.get("best_accuracy", 0.0):
            m["best_accuracy"] = round(accuracy * 100, 2)

        if server_round == self.total_rounds:
            m["status"]       = "completed"
            m["completed_at"] = datetime.utcnow().isoformat()
            self._save_final_global_model()
        else:
            m["status"] = "running"

        save_metrics(m)

        clin  = f"  Clinical: {metrics.get('clinical_accuracy',0)*100:.2f}%" \
                if "clinical_accuracy" in metrics else ""
        fused = f"  Fused: {metrics.get('fused_accuracy',0)*100:.2f}%" \
                if "fused_accuracy" in metrics else ""
        print(f"[Round {server_round}/{self.total_rounds}] "
              f"Image: {accuracy*100:.2f}%  Loss: {loss:.4f}{clin}{fused}")

        return aggregated

    # ── track connected clients ───────────────────────────────────────────────

    def configure_fit(self, server_round, parameters, client_manager):
        config = super().configure_fit(server_round, parameters, client_manager)
        m = load_metrics()
        m["clients_connected"] = client_manager.num_available()
        save_metrics(m)
        print(f"[Server] Round {server_round} — "
              f"{client_manager.num_available()} client(s) connected")
        return config

    # ── save final global model ───────────────────────────────────────────────

    def _save_final_global_model(self):
        if self._last_params is None:
            print("[Server] WARNING: no aggregated parameters to save")
            return
        try:
            image_model = get_model(num_classes=2, freeze_base=False).to(device)
            clin_model  = ClinicalMLP(input_features=len(selected_features)).to(device)
            n_image     = len(list(image_model.parameters()))

            all_arrays  = parameters_to_ndarrays(self._last_params)
            img_arrays  = all_arrays[:n_image]
            clin_arrays = all_arrays[n_image:]

            _load_model_weights(image_model, img_arrays)
            _load_model_weights(clin_model,  clin_arrays)

            torch.save(image_model.state_dict(), FL_IMAGE_OUT)
            torch.save(clin_model.state_dict(),  FL_CLIN_OUT)
            print(f"[Server] Final global image model    -> {FL_IMAGE_OUT}")
            print(f"[Server] Final global clinical model -> {FL_CLIN_OUT}")
        except Exception as e:
            print(f"[Server] WARNING: could not save final model — {e}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds",      type=int, default=10)
    parser.add_argument("--min_clients", type=int, default=3)
    parser.add_argument("--port",        type=int, default=8080)
    args = parser.parse_args()

    print("[Server] Building initial global model from pretrained weights...")
    initial_params = build_initial_parameters()

    strategy = PCOSFedAvgStrategy(
        total_rounds=args.rounds,
        initial_parameters=initial_params,
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=args.min_clients,
        min_evaluate_clients=args.min_clients,
        min_available_clients=args.min_clients,
        evaluate_metrics_aggregation_fn=weighted_average,
        fit_metrics_aggregation_fn=weighted_average,
    )

    print(f"[Server] Starting on port {args.port} — "
          f"{args.rounds} rounds, min {args.min_clients} clients\n")

    fl.server.start_server(
        server_address=f"0.0.0.0:{args.port}",
        config=fl.server.ServerConfig(num_rounds=args.rounds),
        strategy=strategy,
        grpc_max_message_length=536870912,  # 512 MB
    )


if __name__ == "__main__":
    main()
