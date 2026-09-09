"""
split_dataset.py
Splits an existing ImageFolder dataset into 3 hospital partitions for FL simulation.

Usage:
    python split_dataset.py --data_dir ./data --output_dir ./data/federated --splits 3

Expected input structure (case-insensitive class folders):
    data/
      train/
        pcos/ or PCOS/   *.jpg
        normal/ or Normal/ *.jpg
      val/
        pcos/ or PCOS/   *.jpg
        normal/ or Normal/ *.jpg

Output structure (always lowercase):
    data/federated/
      hospital_a/train/pcos, hospital_a/train/normal, hospital_a/val/...
      hospital_b/train/pcos, hospital_b/train/normal, hospital_b/val/...
      hospital_c/train/pcos, hospital_c/train/normal, hospital_c/val/...
"""

import os
import shutil
import random
import argparse
import json

HOSPITAL_NAMES = ["hospital_a", "hospital_b", "hospital_c"]


def split_class_files(files, n_splits, seed=42):
    """Randomly shuffle and split files into n_splits roughly equal parts."""
    random.seed(seed)
    shuffled = files[:]
    random.shuffle(shuffled)
    size = len(shuffled) // n_splits
    splits = []
    for i in range(n_splits):
        start = i * size
        end = start + size if i < n_splits - 1 else len(shuffled)
        splits.append(shuffled[start:end])
    return splits


def split_dataset(data_dir, output_dir, n_splits=3):
    splits_info = {}

    for subset in ["train", "val"]:
        subset_dir = os.path.join(data_dir, subset)
        if not os.path.exists(subset_dir):
            print(f"Skipping {subset} — directory not found.")
            continue

        # Collect class folders; normalise names to lowercase for output
        raw_classes = [
            d for d in os.listdir(subset_dir)
            if os.path.isdir(os.path.join(subset_dir, d))
        ]
        # Map lowercase canonical name → actual folder name on disk
        class_map = {d.lower(): d for d in raw_classes}

        class_splits = {}
        for cls_lower, cls_actual in class_map.items():
            cls_dir = os.path.join(subset_dir, cls_actual)
            files = [
                os.path.join(cls_dir, f)
                for f in os.listdir(cls_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png"))
            ]
            class_splits[cls_lower] = split_class_files(files, n_splits)

        for i, hospital in enumerate(HOSPITAL_NAMES[:n_splits]):
            for cls_lower in class_splits:
                dest_dir = os.path.join(output_dir, hospital, subset, cls_lower)
                os.makedirs(dest_dir, exist_ok=True)
                for src in class_splits[cls_lower][i]:
                    shutil.copy2(src, os.path.join(dest_dir, os.path.basename(src)))

            total = sum(len(class_splits[cls][i]) for cls in class_splits)
            splits_info.setdefault(hospital, {})[subset] = {
                cls: len(class_splits[cls][i]) for cls in class_splits
            }
            splits_info[hospital][subset]["total"] = total
            print(f"  {hospital}/{subset}: {splits_info[hospital][subset]}")

    # Save split summary
    os.makedirs(output_dir, exist_ok=True)
    summary_path = os.path.join(output_dir, "split_summary.json")
    with open(summary_path, "w") as f:
        json.dump(splits_info, f, indent=2)
    print(f"\nSplit summary saved to {summary_path}")
    return splits_info


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir",    default="./data",           help="Path to original dataset")
    parser.add_argument("--output_dir",  default="./data/federated", help="Output path for hospital splits")
    parser.add_argument("--splits",      type=int, default=3,        help="Number of hospital splits")
    args = parser.parse_args()

    print(f"Splitting dataset from '{args.data_dir}' into {args.splits} hospital partitions...")
    split_dataset(args.data_dir, args.output_dir, args.splits)
    print("Done.")
