"""
prepare_data.py
Fixes two issues:
1. Populates empty val/ by moving 20% of train images into it
2. Renames Normal->normal and PCOS->pcos so split_dataset.py works

Run once:
    python prepare_data.py
"""
import os
import shutil
import random

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TRAIN_DIR = os.path.join(DATA_DIR, "train")
VAL_DIR   = os.path.join(DATA_DIR, "val")
VAL_SPLIT = 0.20
SEED      = 42

random.seed(SEED)

# Step 1 — rename class folders to lowercase in both train and val
RENAME_MAP = {"Normal": "normal", "PCOS": "pcos"}

for subset in [TRAIN_DIR, VAL_DIR]:
    for old_name, new_name in RENAME_MAP.items():
        old_path = os.path.join(subset, old_name)
        new_path = os.path.join(subset, new_name)
        if os.path.exists(old_path) and not os.path.exists(new_path):
            os.rename(old_path, new_path)
            print(f"Renamed {old_path} -> {new_path}")

# Step 2 — populate val/ from train/ if val is empty
for cls in ["normal", "pcos"]:
    train_cls = os.path.join(TRAIN_DIR, cls)
    val_cls   = os.path.join(VAL_DIR,   cls)
    os.makedirs(val_cls, exist_ok=True)

    existing_val = [f for f in os.listdir(val_cls) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    if existing_val:
        print(f"val/{cls} already has {len(existing_val)} images, skipping.")
        continue

    all_files = [f for f in os.listdir(train_cls) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    random.shuffle(all_files)
    n_val = max(1, int(len(all_files) * VAL_SPLIT))
    to_move = all_files[:n_val]

    for fname in to_move:
        shutil.move(os.path.join(train_cls, fname), os.path.join(val_cls, fname))

    print(f"Moved {len(to_move)} images from train/{cls} -> val/{cls}")

print("\nDone. Now run:")
print("  python split_dataset.py --data_dir ./data --output_dir ./data/federated")
