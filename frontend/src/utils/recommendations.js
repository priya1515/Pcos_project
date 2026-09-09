const RANGES = {
  amh:         { high: 5.0  },
  lh:          { high: 10.0 },
  prl:         { high: 25.0 },
  vit_d3:      { low:  20.0 },
  follicle_r:  { high: 12   },
  follicle_l:  { high: 12   },
  avg_f_size_r:{ low: 2.0, high: 9.0 },
  cycle_length:{ high: 35   },
  rbs:         { high: 140  },
  bp_systolic: { high: 130  },
};

function getRiskTier(pct) {
  if (pct < 30)  return "low";
  if (pct < 50)  return "borderline";
  if (pct < 70)  return "moderate";
  if (pct < 85)  return "high";
  return "very-high";
}

export function getRiskLabel(pct) {
  return {
    "low":       { label: "Low Risk",       color: "emerald" },
    "borderline":{ label: "Borderline",     color: "yellow"  },
    "moderate":  { label: "Moderate Risk",  color: "orange"  },
    "high":      { label: "High Risk",      color: "red"     },
    "very-high": { label: "Very High Risk", color: "rose"    },
  }[getRiskTier(pct)];
}

export function generateRecommendations(pcosProbPct, clinical) {
  const tier   = getRiskTier(pcosProbPct);
  const isPcos = pcosProbPct >= 50;

  const medical   = [];
  const lifestyle = [];

  // The first item always reflects the screening result, so normal and PCOS
  // results cannot receive the same generic lifestyle recommendation.
  lifestyle.push(isPcos
    ? "Focus on a PCOS-supportive routine: regular high-fibre, low-GI meals plus aerobic and resistance exercise each week."
    : "Maintain the reassuring screening result with balanced meals, regular activity, adequate sleep, and routine preventive check-ups.");

  // ── 1. Clinical-value flags (only when a value is actually abnormal) ──

  if (clinical) {
    const v = (key) => parseFloat(clinical[key]);

    const amh  = v("amh");
    const lh   = v("lh");
    const prl  = v("prl");
    const vitD = v("vit_d3");
    const fr   = v("follicle_r");
    const fl   = v("follicle_l");
    const fs   = v("avg_f_size_r");
    const cyc  = v("cycle_length");
    const rbs  = v("rbs");
    const bp   = v("bp_systolic");

    if (!isNaN(amh) && amh > RANGES.amh.high)
      medical.push(`Elevated AMH (${amh} ng/mL) — consider endocrinology referral for anti-Müllerian hormone evaluation.`);

    if (!isNaN(lh) && lh > RANGES.lh.high)
      medical.push(`High LH (${lh} mIU/mL) — LH:FSH ratio assessment recommended to confirm hormonal imbalance.`);

    if (!isNaN(prl) && prl > RANGES.prl.high)
      medical.push(`Elevated Prolactin (${prl} ng/mL) — rule out hyperprolactinemia; further hormonal workup advised.`);

    if (!isNaN(cyc) && cyc > RANGES.cycle_length.high)
      medical.push(`Irregular cycle length (${cyc} days) — oligomenorrhea noted; hormonal panel and thyroid function test recommended.`);

    if ((!isNaN(fr) && fr > RANGES.follicle_r.high) || (!isNaN(fl) && fl > RANGES.follicle_l.high))
      medical.push(`Elevated follicle count (R: ${fr}, L: ${fl}) — polycystic ovarian morphology; transvaginal ultrasound confirmation advised.`);

    if (!isNaN(fs) && (fs < RANGES.avg_f_size_r.low || fs > RANGES.avg_f_size_r.high))
      medical.push(`Abnormal average follicle size (${fs} mm) — detailed ovarian morphology assessment recommended.`);

    if (!isNaN(vitD) && vitD < RANGES.vit_d3.low)
      lifestyle.push(`Low Vitamin D3 (${vitD} ng/mL) — prescribe Vitamin D3 supplementation; deficiency is associated with worsened insulin resistance in PCOS.`);

    if (!isNaN(rbs) && rbs > RANGES.rbs.high)
      lifestyle.push(`Elevated blood sugar (${rbs} mg/dl) — advise low-GI diet, reduced refined carbohydrates, and order fasting glucose / HbA1c.`);

    if (!isNaN(bp) && bp > RANGES.bp_systolic.high)
      lifestyle.push(`Elevated systolic BP (${bp} mmHg) — advise sodium restriction and regular BP monitoring.`);
  }

  // ── 2. Tier-level additions (only fill a category if not already covered) ──

  if (tier === "moderate") {
    if (medical.length === 0)
      medical.push("Comprehensive PCOS evaluation recommended — full hormonal panel (FSH, LH, testosterone, DHEAS) and thyroid function.");
    if (lifestyle.length === 1)
      lifestyle.push("Advise low-GI, anti-inflammatory diet and regular aerobic and resistance exercise to improve insulin sensitivity.");

  } else if (tier === "high") {
    if (medical.length === 0)
      medical.push("Specialist referral to a reproductive endocrinologist recommended. Discuss Metformin or hormonal therapy options.");
    if (lifestyle.length === 1)
      lifestyle.push("Advise structured weight management — even 5–7% weight reduction significantly improves PCOS symptoms.");

  } else if (tier === "very-high") {
    if (medical.length === 0)
      medical.push("Urgent referral to reproductive endocrinologist. Evaluate for metabolic syndrome, type 2 diabetes, and fertility implications.");
    if (lifestyle.length === 1)
      lifestyle.push("Refer to a clinical dietitian for a personalised PCOS nutrition plan. Structured exercise under supervision recommended.");
  }

  return { medical, lifestyle };
}
