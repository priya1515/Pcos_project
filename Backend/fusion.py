def fuse_predictions(clinical_pcos_prob: float, image_pcos_prob: float, threshold: float = 0.50) -> dict:
    """
    Equal-weight average fusion of clinical and image PCOS probabilities.

    Both inputs must be raw probabilities in [0, 1].
    Returns the fused result with individual and combined probabilities.
    """
    fused_prob = 0.5 * clinical_pcos_prob + 0.5 * image_pcos_prob
    prediction = "PCOS" if fused_prob >= threshold else "Normal"

    return {
        "prediction": prediction,
        "pcos_probability": round(fused_prob, 4),
        "normal_probability": round(1.0 - fused_prob, 4),
        "clinical_pcos_probability": round(clinical_pcos_prob, 4),
        "image_pcos_probability": round(image_pcos_prob, 4),
        "threshold": threshold,
    }
