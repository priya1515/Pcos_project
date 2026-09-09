"""
split_clinical.py
=================
Reads your real PCOS clinical dataset from:
    data/Clinical dataset/Clinical_data.xlsx  (sheet: Full_new)

Cleans the messy column names (extra spaces, irregular spacing in beta-HCG),
keeps only the 15 features the clinical model was trained on + the PCOS label,
then splits into 3 hospital partitions:

    data/federated/hospital_a/clinical_train.csv  +  clinical_val.csv
    data/federated/hospital_b/clinical_train.csv  +  clinical_val.csv
    data/federated/hospital_c/clinical_train.csv  +  clinical_val.csv

Usage:
    python split_clinical.py
    python split_clinical.py --val_ratio 0.2 --seed 42
"""

import os
import sys
import csv
import math
import random
import argparse

import pandas as pd

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

from clinical_model import selected_features   # the 15 features the model uses

HOSPITAL_NAMES = ["hospital_a", "hospital_b", "hospital_c"]

EXCEL_PATH  = os.path.join(_BACKEND_DIR, "data", "Clinical dataset", "Clinical_data.xlsx")
SHEET_NAME  = "Full_new"
LABEL_COL   = "PCOS (Y/N)"          # 0 = Normal, 1 = PCOS
OUTPUT_DIR  = os.path.join(_BACKEND_DIR, "data", "federated")

# ── Column name mapping: raw Excel name -> clean model name ──────────────────
# Strip all columns first, then apply these extra remaps for the beta-HCG cols
# whose Excel names have irregular internal spaces.
COLUMN_REMAP = {
    "I   beta-HCG(mIU/mL)": "I beta-HCG(mIU/mL)",    # after strip: "I   beta-HCG..."
    "II    beta-HCG(mIU/mL)": "II beta-HCG(mIU/mL)",  # after strip: "II    beta-HCG..."
}


# ── load & clean ──────────────────────────────────────────────────────────────

def load_and_clean() -> pd.DataFrame:
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file not found at:\n  {EXCEL_PATH}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=0, engine="openpyxl")
    print(f"Loaded sheet '{SHEET_NAME}': {df.shape[0]} rows x {df.shape[1]} columns")

    # Step 1: strip leading/trailing whitespace from all column names
    df.columns = [c.strip() for c in df.columns]

    # Step 2: apply extra remaps for irregular internal spaces
    df.rename(columns=COLUMN_REMAP, inplace=True)

    # Step 3: verify all 15 features are now present
    missing = [f for f in selected_features if f not in df.columns]
    if missing:
        print("\nERROR: After cleaning, these feature columns are still missing:")
        for m in missing:
            print(f"  '{m}'")
        print("\nAvailable columns after cleaning:")
        for c in df.columns:
            print(f"  '{c}'")
        sys.exit(1)

    if LABEL_COL not in df.columns:
        print(f"ERROR: Label column '{LABEL_COL}' not found.")
        sys.exit(1)

    # Step 4: keep only the columns we need
    keep = selected_features + [LABEL_COL]
    df = df[keep].copy()

    # Step 5: normalise label to int (Y->1, N->0, already 0/1 stays as-is)
    def parse_label(v):
        s = str(v).strip().upper()
        if s in ("Y", "YES", "1", "1.0"):
            return 1
        if s in ("N", "NO", "0", "0.0"):
            return 0
        return None

    df["label"] = df[LABEL_COL].apply(parse_label)
    df.drop(columns=[LABEL_COL], inplace=True)

    # Step 6: drop rows with any NaN in features or label
    before = len(df)
    df.dropna(inplace=True)
    df = df[df["label"].notna()].copy()
    df["label"] = df["label"].astype(int)
    after = len(df)

    if before != after:
        print(f"Dropped {before - after} rows with missing values ({after} remain)")

    pcos   = int((df["label"] == 1).sum())
    normal = int((df["label"] == 0).sum())
    print(f"Clean dataset: {after} rows  |  PCOS={pcos}  Normal={normal}")
    return df


# ── split & write ─────────────────────────────────────────────────────────────

def split_and_write(df: pd.DataFrame, val_ratio: float, seed: int):
    rows = df.to_dict("records")
    random.seed(seed)
    random.shuffle(rows)

    n     = len(rows)
    chunk = n // len(HOSPITAL_NAMES)

    print(f"\nSplitting {n} rows into {len(HOSPITAL_NAMES)} hospital partitions "
          f"(val_ratio={val_ratio}):\n")

    fieldnames = selected_features + ["label"]

    for i, hospital in enumerate(HOSPITAL_NAMES):
        start      = i * chunk
        end        = start + chunk if i < len(HOSPITAL_NAMES) - 1 else n
        hosp_rows  = rows[start:end]

        n_val      = max(1, math.floor(len(hosp_rows) * val_ratio))
        val_rows   = hosp_rows[:n_val]
        train_rows = hosp_rows[n_val:]

        hosp_dir   = os.path.join(OUTPUT_DIR, hospital)
        os.makedirs(hosp_dir, exist_ok=True)

        for split_name, split_rows in [("clinical_train", train_rows), ("clinical_val", val_rows)]:
            out_path = os.path.join(hosp_dir, f"{split_name}.csv")
            with open(out_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(split_rows)

        pcos   = sum(r["label"] == 1 for r in train_rows)
        normal = len(train_rows) - pcos
        print(f"  [{hospital}]")
        print(f"    train : {len(train_rows):>4} rows  (PCOS={pcos}, Normal={normal})")
        print(f"    val   : {len(val_rows):>4} rows")
        print(f"    saved : {os.path.join(hosp_dir, 'clinical_train.csv')}")
        print(f"            {os.path.join(hosp_dir, 'clinical_val.csv')}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Split real PCOS clinical Excel into 3 hospital FL partitions."
    )
    parser.add_argument("--val_ratio", type=float, default=0.20,
                        help="Fraction used for validation per hospital (default: 0.20)")
    parser.add_argument("--seed",      type=int,   default=42,
                        help="Random seed for reproducible splits (default: 42)")
    args = parser.parse_args()

    print(f"Source : {EXCEL_PATH}")
    print(f"Output : {OUTPUT_DIR}\n")

    df = load_and_clean()
    split_and_write(df, args.val_ratio, args.seed)

    print("\nDone. Now run the FL pipeline:")
    print("  python fl_server.py --rounds 10 --min_clients 3")
    print("  python fl_client.py --hospital hospital_a")
    print("  python fl_client.py --hospital hospital_b")
    print("  python fl_client.py --hospital hospital_c")


if __name__ == "__main__":
    main()
