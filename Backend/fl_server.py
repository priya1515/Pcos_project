"""
fl_server.py
Flower federated learning server for PCOS ResNet-50 model.

Usage:
    python fl_server.py --rounds 10 --min_clients 3

The server saves round metrics to fl_metrics.json after each round
so the FastAPI endpoint can serve them to the frontend dashboard.
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import flwr as fl
from flwr.common import Metrics

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FL_METRICS_PATH = os.path.join(_BACKEND_DIR, "fl_metrics.json")


def load_metrics() -> dict:
    if os.path.exists(FL_METRICS_PATH):
        with open(FL_METRICS_PATH) as f:
            return json.load(f)
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


def save_metrics(metrics: dict):
    with open(FL_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)


def weighted_average(metrics: List[Tuple[int, Metrics]]) -> Metrics:
    """FedAvg aggregation for evaluation metrics."""
    total_samples = sum(n for n, _ in metrics)
    accuracies = [n * m["accuracy"] for n, m in metrics]
    losses     = [n * m.get("loss", 0.0) for n, m in metrics]
    return {
        "accuracy": sum(accuracies) / total_samples,
        "loss":     sum(losses)     / total_samples,
    }


class MetricsStrategy(fl.server.strategy.FedAvg):
    """FedAvg strategy that persists round metrics to fl_metrics.json."""

    def __init__(self, total_rounds: int, **kwargs):
        super().__init__(**kwargs)
        self.total_rounds = total_rounds
        m = load_metrics()
        m.update({
            "status": "running",
            "current_round": 0,
            "total_rounds": total_rounds,
            "rounds": [],
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "best_accuracy": 0.0,
        })
        save_metrics(m)

    def aggregate_evaluate(self, server_round, results, failures):
        aggregated = super().aggregate_evaluate(server_round, results, failures)

        if aggregated is None:
            return aggregated

        loss, metrics = aggregated
        accuracy = metrics.get("accuracy", 0.0)

        m = load_metrics()
        m["current_round"] = server_round
        m["rounds"].append({
            "round":    server_round,
            "accuracy": round(accuracy * 100, 2),
            "loss":     round(loss, 4),
            "clients":  len(results),
            "timestamp": datetime.utcnow().isoformat(),
        })

        if accuracy > m.get("best_accuracy", 0.0):
            m["best_accuracy"] = round(accuracy * 100, 2)

        if server_round == self.total_rounds:
            m["status"] = "completed"
            m["completed_at"] = datetime.utcnow().isoformat()
        else:
            m["status"] = "running"

        save_metrics(m)
        print(f"[Round {server_round}/{self.total_rounds}] "
              f"Loss: {loss:.4f}  Accuracy: {accuracy*100:.2f}%")
        return aggregated

    def configure_fit(self, server_round, parameters, client_manager):
        config = super().configure_fit(server_round, parameters, client_manager)
        m = load_metrics()
        m["clients_connected"] = client_manager.num_available()
        m["current_round"] = server_round
        save_metrics(m)
        return config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds",      type=int, default=10, help="Number of FL rounds")
    parser.add_argument("--min_clients", type=int, default=3,  help="Minimum clients per round")
    parser.add_argument("--port",        type=int, default=8080)
    args = parser.parse_args()

    strategy = MetricsStrategy(
        total_rounds=args.rounds,
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=args.min_clients,
        min_evaluate_clients=args.min_clients,
        min_available_clients=args.min_clients,
        evaluate_metrics_aggregation_fn=weighted_average,
    )

    print(f"Starting FL server on port {args.port} "
          f"for {args.rounds} rounds with {args.min_clients} clients...")

    fl.server.start_server(
        server_address=f"0.0.0.0:{args.port}",
        config=fl.server.ServerConfig(num_rounds=args.rounds),
        strategy=strategy,
    )


if __name__ == "__main__":
    main()
