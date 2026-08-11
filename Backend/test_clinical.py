from clinical_model import predict_clinical, selected_features


print("\n========================================")
print("       CLINICAL MODEL TEST")
print("========================================")

print(
    f"Number of required features: "
    f"{len(selected_features)}"
)

print("\nRequired features:")

for i, feature in enumerate(selected_features):
    print(f"{i}: {feature}")


# ============================================================
# TEST PATIENT
# ============================================================
#
# These are example values only.
#
# Later, these values will come from the frontend.
#
# IMPORTANT:
# The feature names MUST exactly match the selected features
# from the trained Model 2.
# ============================================================

sample_patient = {

    "I beta-HCG(mIU/mL)": 1.99,

    "Follicle No. (R)": 3,

    "II beta-HCG(mIU/mL)": 1.99,

    "Vit D3 (ng/mL)": 17.1,

    "Height(Cm)": 152.0,

    "RBS(mg/dl)": 92.0,

    "BP _Systolic (mmHg)": 110.0,

    "Follicle No. (L)": 3,

    "Age (yrs)": 28.0,

    "AMH(ng/mL)": 2.07,

    "PRL(ng/mL)": 45.16,

    "Avg. F size (R) (mm)": 18.0,

    "LH(mIU/mL)": 3.68,

    "Pulse rate(bpm)": 78.0,

    "Cycle length(days)": 5.0
}


# ============================================================
# CHECK FOR MISSING FEATURES
# ============================================================

missing_features = [
    feature
    for feature in selected_features
    if feature not in sample_patient
]

extra_features = [
    feature
    for feature in sample_patient
    if feature not in selected_features
]


print("\n========================================")
print("       INPUT VALIDATION")
print("========================================")

if missing_features:

    print("\nMissing features:")

    for feature in missing_features:
        print("-", feature)

    raise ValueError(
        "Some required clinical features are missing."
    )

else:

    print("All required features are present.")


if extra_features:

    print("\nExtra features ignored:")

    for feature in extra_features:
        print("-", feature)


# ============================================================
# DISPLAY INPUT
# ============================================================

print("\n========================================")
print("       TEST PATIENT INPUT")
print("========================================")

for feature in selected_features:

    print(
        f"{feature}: "
        f"{sample_patient[feature]}"
    )


# ============================================================
# PREDICTION
# ============================================================

print("\n========================================")
print("       RUNNING CLINICAL MODEL")
print("========================================")

try:

    result = predict_clinical(
        sample_patient
    )

    print("\n========================================")
    print("       PREDICTION RESULT")
    print("========================================")

    print(
        "Prediction:",
        result["prediction"]
    )

    print(
        "PCOS Probability:",
        f"{result['pcos_probability']:.4f}"
    )

    print(
        "Normal Probability:",
        f"{result['normal_probability']:.4f}"
    )

    print(
        "Threshold:",
        result["threshold"]
    )

    print("========================================")


except Exception as e:

    print("\n========================================")
    print("              ERROR")
    print("========================================")

    print(type(e).__name__)
    print(str(e))

    print("\nIf the error is related to SimpleImputer")
    print("or '_fill_dtype', make sure scikit-learn")
    print("version is exactly 1.6.1.")

    print("========================================")